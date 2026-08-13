'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAppAdmin } from '@/entities/profile';
import {
  getConnectionPublicSnapshot,
  getTarget,
  saveConnections,
  switchActiveTarget,
  testConnection,
  type SupabaseTarget,
} from '@/shared/config/connection';
import {
  createCloudServiceClient,
  createLocalServiceClient,
} from '@/shared/lib/supabase/service';

export type SettingsActionState = {
  error?: string;
  success?: string;
  report?: string;
};

const targetSchema = z.enum(['local', 'cloud']);

export async function getSettingsSnapshot() {
  await requireAppAdmin();
  return getConnectionPublicSnapshot();
}

export async function switchTarget(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    await requireAppAdmin();
    const target = targetSchema.parse(String(formData.get('target') || ''));
    await switchActiveTarget(target);
    revalidatePath('/settings');
    revalidatePath('/');
    return {
      success: `Target ativo: ${target}. Faça login de novo se a sessão for do outro ambiente.`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha ao trocar target' };
  }
}

export async function saveConnection(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    await requireAppAdmin();
    const target = targetSchema.parse(
      String(formData.get('target') || (await getTarget())),
    );

    await saveConnections({
      target,
      localUrl: String(formData.get('localUrl') || '') || undefined,
      localPublishableKey:
        String(formData.get('localPublishableKey') || '') || undefined,
      localSecretKey: String(formData.get('localSecretKey') || '') || undefined,
      cloudUrl: String(formData.get('cloudUrl') || '') || undefined,
      cloudPublishableKey:
        String(formData.get('cloudPublishableKey') || '') || undefined,
      cloudSecretKey: String(formData.get('cloudSecretKey') || '') || undefined,
    });

    revalidatePath('/settings');
    revalidatePath('/');
    return { success: 'Conexão salva na tabela (local e cloud quando possível).' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha ao salvar' };
  }
}

export async function testConnectionsAction(
  _prev: SettingsActionState,
  _formData: FormData,
): Promise<SettingsActionState> {
  try {
    await requireAppAdmin();
    const local = await testConnection('local');
    const cloud = await testConnection('cloud');
    const ok = local.ok && cloud.ok;
    const report = `${local.detail} · ${cloud.detail}`;
    return ok
      ? { success: 'Conexões OK', report }
      : { error: 'Falha no teste', report };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha no teste' };
  }
}

export async function syncFromCloud(): Promise<SettingsActionState> {
  try {
    await requireAppAdmin();

    if ((await getTarget()) !== 'local') {
      return {
        error: 'Sync cloud→local só com target local ativo',
      };
    }

    const cloud = await createCloudServiceClient();
    const local = await createLocalServiceClient();

    const { data: cloudProjects, error: projectsError } = await cloud
      .from('projects')
      .select('id, slug, name, github_owner, github_repo, created_at, updated_at');
    if (projectsError) throw projectsError;

    let projectsUpserted = 0;
    const slugToLocalId = new Map<string, string>();

    for (const project of cloudProjects ?? []) {
      const { data, error } = await local
        .from('projects')
        .upsert(
          {
            slug: project.slug,
            name: project.name,
            github_owner: project.github_owner,
            github_repo: project.github_repo,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' },
        )
        .select('id, slug')
        .single();
      if (error) throw error;
      slugToLocalId.set(data.slug, data.id);
      projectsUpserted += 1;
    }

    const { data: localProjects } = await local
      .from('projects')
      .select('id, slug');
    for (const p of localProjects ?? []) {
      slugToLocalId.set(p.slug, p.id);
    }

    const cloudIdToSlug = new Map(
      (cloudProjects ?? []).map((p) => [p.id as string, p.slug as string]),
    );

    const { data: cloudExclusions, error: exErr } = await cloud
      .from('exclusions')
      .select(
        'project_id, finding_key, reason, scope_glob, active, occurrences, source, updated_at',
      );
    if (exErr) throw exErr;

    let exclusionsUpserted = 0;
    for (const row of cloudExclusions ?? []) {
      const slug = cloudIdToSlug.get(row.project_id);
      const localProjectId = slug ? slugToLocalId.get(slug) : undefined;
      if (!localProjectId) continue;
      const { error } = await local.from('exclusions').upsert(
        {
          project_id: localProjectId,
          finding_key: row.finding_key,
          reason: row.reason ?? '',
          scope_glob: row.scope_glob ?? '**/*',
          active: row.active ?? true,
          occurrences: row.occurrences ?? 1,
          source: row.source ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,finding_key,scope_glob' },
      );
      if (error) throw error;
      exclusionsUpserted += 1;
    }

    const { data: cloudConventions, error: convErr } = await cloud
      .from('conventions')
      .select(
        'project_id, finding_key, scope_glob, body, source, occurrences, updated_at',
      );
    if (convErr) throw convErr;

    let conventionsUpserted = 0;
    for (const row of cloudConventions ?? []) {
      const slug = cloudIdToSlug.get(row.project_id);
      const localProjectId = slug ? slugToLocalId.get(slug) : undefined;
      if (!localProjectId || !row.finding_key) continue;
      const { error } = await local.from('conventions').upsert(
        {
          project_id: localProjectId,
          finding_key: row.finding_key,
          scope_glob: row.scope_glob ?? '**/*',
          body: row.body,
          source: row.source ?? null,
          occurrences: row.occurrences ?? 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,finding_key' },
      );
      if (error) throw error;
      conventionsUpserted += 1;
    }

    const { data: cloudMembers, error: memErr } = await cloud
      .from('project_members')
      .select('project_id, role, profiles(email)');
    if (memErr) throw memErr;

    const { data: localProfiles } = await local
      .from('profiles')
      .select('id, email');
    const emailToLocalUser = new Map(
      (localProfiles ?? [])
        .filter((p) => p.email)
        .map((p) => [String(p.email).toLowerCase(), p.id as string]),
    );

    let membersUpserted = 0;
    for (const member of cloudMembers ?? []) {
      const slug = cloudIdToSlug.get(member.project_id);
      const localProjectId = slug ? slugToLocalId.get(slug) : undefined;
      const profiles = member.profiles as
        | { email: string | null }
        | { email: string | null }[]
        | null;
      const email = Array.isArray(profiles)
        ? profiles[0]?.email
        : profiles?.email;
      if (!localProjectId || !email) continue;
      const localUserId = emailToLocalUser.get(email.toLowerCase());
      if (!localUserId) continue;
      const { error } = await local.from('project_members').upsert(
        {
          project_id: localProjectId,
          user_id: localUserId,
          role: member.role,
        },
        { onConflict: 'project_id,user_id' },
      );
      if (error) throw error;
      membersUpserted += 1;
    }

    const report = [
      `${projectsUpserted} projects`,
      `${exclusionsUpserted} exclusions`,
      `${conventionsUpserted} conventions`,
      `${membersUpserted} memberships (por e-mail)`,
    ].join(' · ');

    revalidatePath('/');
    revalidatePath('/settings');
    return { success: 'Sync cloud→local concluído', report };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Falha no sync',
    };
  }
}

export type { SupabaseTarget };
