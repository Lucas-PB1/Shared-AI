import { createClient } from '@/shared/lib/supabase/server';

import type {
  Convention,
  Decision,
  Exclusion,
  Finding,
  Project,
  ProjectMember,
  ReviewRun,
} from './types';

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
      'id, project_id, source, status, actor_kind, actor_ref, git_sha, branch, pr_number, review_slug, started_at, finished_at, meta',
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

export async function getProjectRun(
  projectId: string,
  runId: string,
): Promise<ReviewRun | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('review_runs')
    .select(
      'id, project_id, source, status, actor_kind, actor_ref, git_sha, branch, pr_number, review_slug, started_at, finished_at, meta',
    )
    .eq('project_id', projectId)
    .eq('id', runId)
    .maybeSingle();
  if (error) throw error;
  return data as ReviewRun | null;
}

export async function listRunFindings(runId: string): Promise<Finding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('findings')
    .select(
      'id, run_id, finding_key, file_path, line_start, line_end, severity, category, summary, body',
    )
    .eq('run_id', runId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Finding[];
}

export async function listRunDecisions(runId: string): Promise<Decision[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('decisions')
    .select(
      'id, project_id, run_id, finding_id, finding_key, verdict, reason, decided_by, source, file_path, summary, finalized_at, meta',
    )
    .eq('run_id', runId)
    .order('finalized_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Decision[];
}

export async function listProjectExclusions(
  projectId: string,
): Promise<Exclusion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('exclusions')
    .select(
      'id, project_id, finding_key, reason, scope_glob, active, occurrences, source, updated_at',
    )
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Exclusion[];
}

export async function listProjectConventions(
  projectId: string,
): Promise<Convention[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('conventions')
    .select(
      'id, project_id, finding_key, scope_glob, body, source, occurrences, updated_at',
    )
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Convention[];
}

export async function listProjectAcceptedDecisions(
  projectId: string,
): Promise<Decision[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('decisions')
    .select(
      'id, project_id, run_id, finding_id, finding_key, verdict, reason, decided_by, source, file_path, summary, finalized_at, meta',
    )
    .eq('project_id', projectId)
    .eq('verdict', 'aceito')
    .order('finalized_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Decision[];
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
