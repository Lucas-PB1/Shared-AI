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
    revalidatePath('/', 'layout');
    return {
      success: `Ambiente: ${target}. Faça login de novo se a sessão for do outro lado.`,
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

    const { data: cloudRuns, error: runsErr } = await cloud
      .from('review_runs')
      .select(
        'id, project_id, source, status, actor_kind, actor_ref, git_sha, branch, pr_number, review_slug, pr_author, pr_author_is_bot, reviewers, started_at, finished_at, meta',
      )
      .eq('source', 'ci');
    if (runsErr) throw runsErr;

    const cloudRunIdToLocalProject = new Map<string, string>();
    let runsUpserted = 0;
    for (const run of cloudRuns ?? []) {
      const slug = cloudIdToSlug.get(run.project_id);
      const localProjectId = slug ? slugToLocalId.get(slug) : undefined;
      if (!localProjectId) continue;
      cloudRunIdToLocalProject.set(run.id, localProjectId);
      const { error } = await local.from('review_runs').upsert(
        {
          id: run.id,
          project_id: localProjectId,
          source: run.source,
          status: run.status,
          actor_kind: run.actor_kind ?? 'human',
          actor_ref: run.actor_ref ?? null,
          git_sha: run.git_sha ?? null,
          branch: run.branch ?? null,
          pr_number: run.pr_number ?? null,
          review_slug: run.review_slug ?? null,
          pr_author: run.pr_author ?? null,
          pr_author_is_bot: run.pr_author_is_bot ?? false,
          reviewers: run.reviewers ?? [],
          started_at: run.started_at,
          finished_at: run.finished_at ?? null,
          meta: run.meta ?? {},
        },
        { onConflict: 'id' },
      );
      if (error) throw error;
      runsUpserted += 1;
    }

    // Local só espelha CI: apaga runs de teste (local/agent/pre_commit/smoke).
    const { data: localJunkRuns, error: junkErr } = await local
      .from('review_runs')
      .select('id')
      .neq('source', 'ci');
    if (junkErr) throw junkErr;
    let junkPurged = 0;
    if (localJunkRuns && localJunkRuns.length > 0) {
      const junkIds = localJunkRuns.map((r) => r.id as string);
      const { error: delErr } = await local
        .from('review_runs')
        .delete()
        .in('id', junkIds);
      if (delErr) throw delErr;
      junkPurged = junkIds.length;
    }

    const syncedRunIds = [...cloudRunIdToLocalProject.keys()];
    let findingsUpserted = 0;
    if (syncedRunIds.length > 0) {
      const { data: cloudFindings, error: findErr } = await cloud
        .from('findings')
        .select(
          'id, run_id, finding_key, file_path, line_start, line_end, severity, category, summary, body, de_code, para_code, meta, created_at',
        )
        .in('run_id', syncedRunIds);
      if (findErr) throw findErr;

      for (const finding of cloudFindings ?? []) {
        if (!cloudRunIdToLocalProject.has(finding.run_id)) continue;
        const { error } = await local.from('findings').upsert(
          {
            id: finding.id,
            run_id: finding.run_id,
            finding_key: finding.finding_key,
            file_path: finding.file_path ?? null,
            line_start: finding.line_start ?? null,
            line_end: finding.line_end ?? null,
            severity: finding.severity ?? null,
            category: finding.category ?? null,
            summary: finding.summary,
            body: finding.body ?? null,
            de_code: finding.de_code ?? null,
            para_code: finding.para_code ?? null,
            meta: finding.meta ?? {},
            created_at: finding.created_at,
          },
          { onConflict: 'id' },
        );
        if (error) throw error;
        findingsUpserted += 1;
      }
    }

    const { data: cloudDecisions, error: decErr } = await cloud
      .from('decisions')
      .select(
        'id, project_id, run_id, finding_id, finding_key, verdict, reason, decided_by, source, file_path, summary, schema_version, finalized_at, meta',
      );
    if (decErr) throw decErr;

    let decisionsUpserted = 0;
    for (const decision of cloudDecisions ?? []) {
      const slug = cloudIdToSlug.get(decision.project_id);
      const localProjectId = slug ? slugToLocalId.get(slug) : undefined;
      if (!localProjectId) continue;
      const runId =
        decision.run_id && cloudRunIdToLocalProject.has(decision.run_id)
          ? decision.run_id
          : null;
      const { error } = await local.from('decisions').upsert(
        {
          id: decision.id,
          project_id: localProjectId,
          run_id: runId,
          finding_id: decision.finding_id ?? null,
          finding_key: decision.finding_key,
          verdict: decision.verdict,
          reason: decision.reason ?? null,
          decided_by: decision.decided_by ?? null,
          source: decision.source ?? null,
          file_path: decision.file_path ?? null,
          summary: decision.summary ?? null,
          schema_version: decision.schema_version ?? '1',
          finalized_at: decision.finalized_at,
          meta: decision.meta ?? {},
        },
        { onConflict: 'id' },
      );
      if (error) throw error;
      decisionsUpserted += 1;
    }

    const report = [
      `${projectsUpserted} projects`,
      `${runsUpserted} runs CI`,
      `${findingsUpserted} findings`,
      `${decisionsUpserted} decisions`,
      `${exclusionsUpserted} exclusions`,
      `${conventionsUpserted} conventions`,
      `${membersUpserted} memberships`,
      junkPurged > 0 ? `${junkPurged} runs locais removidos` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    revalidatePath('/', 'layout');
    revalidatePath('/settings');
    return { success: 'Sync cloud→local concluído', report };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Falha no sync',
    };
  }
}

export type { SupabaseTarget };
