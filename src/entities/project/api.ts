import { createClient } from '@/shared/lib/supabase/server';

import type { Project, ProjectMember, ReviewRun } from './types';

export async function listMemberProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, slug, name, github_owner, github_repo, created_at, updated_at')
    .order('name');

  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function listUnclaimedProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_unclaimed_projects');
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, slug, name, github_owner, github_repo, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as Project | null;
}

export async function listProjectMembers(
  projectId: string,
): Promise<ProjectMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_members')
    .select(
      'project_id, user_id, role, created_at, profiles(display_name, email)',
    )
    .eq('project_id', projectId)
    .order('created_at');

  if (error) throw error;

  return (data ?? []).map((row) => {
    const profilesRaw = row.profiles as
      | { display_name: string | null; email: string | null }
      | { display_name: string | null; email: string | null }[]
      | null;

    const profiles = Array.isArray(profilesRaw)
      ? (profilesRaw[0] ?? null)
      : profilesRaw;

    return {
      project_id: row.project_id as string,
      user_id: row.user_id as string,
      role: row.role as ProjectMember['role'],
      created_at: row.created_at as string,
      profiles,
    };
  });
}

export async function listProjectRuns(
  projectId: string,
  filters?: { status?: string; source?: string },
): Promise<ReviewRun[]> {
  const supabase = await createClient();
  let query = supabase
    .from('review_runs')
    .select(
      'id, project_id, source, status, actor_kind, actor_ref, git_sha, branch, pr_number, started_at, finished_at',
    )
    .eq('project_id', projectId)
    .order('started_at', { ascending: false })
    .limit(50);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.source) query = query.eq('source', filters.source);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ReviewRun[];
}

export async function getMyRole(
  projectId: string,
  userId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.role ?? null;
}
