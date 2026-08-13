import { createClient } from '@/shared/lib/supabase/server';

import { listMemberProjects } from '@/entities/project';

import type {
  DashboardProjectStat,
  DashboardSnapshot,
  DashboardWeeklyStat,
} from './model/types';

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const projects = await listMemberProjects();
  const slim = projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
  }));

  if (slim.length === 0) {
    return { projects: [], projectStats: [], weekly: [] };
  }

  const ids = slim.map((p) => p.id);
  const supabase = await createClient();

  const [statsRes, weeklyRes] = await Promise.all([
    supabase
      .from('mv_dashboard_project_stats')
      .select(
        'project_id, runs, completed, failed, decisions, aceitos, rejeitados, nao_aplicavel, acceptance_rate',
      )
      .in('project_id', ids),
    supabase
      .from('mv_dashboard_weekly')
      .select('project_id, week_start, runs, aceitos, rejeitados')
      .in('project_id', ids)
      .order('week_start', { ascending: true }),
  ]);

  if (statsRes.error) throw statsRes.error;
  if (weeklyRes.error) throw weeklyRes.error;

  return {
    projects: slim,
    projectStats: (statsRes.data ?? []) as DashboardProjectStat[],
    weekly: (weeklyRes.data ?? []) as DashboardWeeklyStat[],
  };
}
