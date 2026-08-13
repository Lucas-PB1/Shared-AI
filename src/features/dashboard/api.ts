import { createClient } from '@/shared/lib/supabase/server';

import { listMemberProjects } from '@/entities/project';

import type {
  DashboardDecision,
  DashboardRun,
  DashboardSnapshot,
} from './model/types';

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const projects = await listMemberProjects();
  const slim = projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
  }));

  if (slim.length === 0) {
    return { projects: [], runs: [], decisions: [] };
  }

  const ids = slim.map((p) => p.id);
  const supabase = await createClient();

  const [runsRes, decisionsRes] = await Promise.all([
    supabase
      .from('review_runs')
      .select(
        'id, project_id, source, status, started_at, finished_at, pr_number',
      )
      .in('project_id', ids)
      .eq('source', 'ci')
      .order('started_at', { ascending: true })
      .limit(2000),
    supabase
      .from('decisions')
      .select('id, project_id, run_id, verdict, finalized_at, decided_by')
      .in('project_id', ids)
      .like('source', 'github-pr-%')
      .order('finalized_at', { ascending: true })
      .limit(5000),
  ]);

  if (runsRes.error) throw runsRes.error;
  if (decisionsRes.error) throw decisionsRes.error;

  return {
    projects: slim,
    runs: (runsRes.data ?? []) as DashboardRun[],
    decisions: (decisionsRes.data ?? []) as DashboardDecision[],
  };
}
