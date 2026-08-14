import type {
  DashboardMetrics,
  DashboardProject,
  DashboardProjectStat,
  DashboardWeeklyStat,
  NamedCount,
  ProjectPoint,
  WeekPoint,
} from './types.js';

function emptyStat(projectId: string): DashboardProjectStat {
  return {
    project_id: projectId,
    runs: 0,
    completed: 0,
    failed: 0,
    decisions: 0,
    aceitos: 0,
    rejeitados: 0,
    nao_aplicavel: 0,
    acceptance_rate: null,
  };
}

function weekLabel(weekStart: string): string {
  const iso = weekStart.includes('T')
    ? weekStart
    : `${weekStart}T00:00:00.000Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return weekStart.slice(0, 10);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

function weekKey(weekStart: string): string {
  return weekStart.slice(0, 10);
}

function acceptanceFromCounts(
  aceitos: number,
  rejeitados: number,
): number | null {
  const decided = aceitos + rejeitados;
  if (decided <= 0) return null;
  return Math.round((aceitos / decided) * 1000) / 10;
}

/**
 * Monta métricas do dashboard a partir das Materialized Views.
 * Escopo `all` soma os projetos do snapshot; UUID filtra um projeto.
 */
export function computeDashboardMetrics(
  projects: DashboardProject[],
  projectStats: DashboardProjectStat[],
  weekly: DashboardWeeklyStat[],
  projectId: string | 'all' = 'all',
): DashboardMetrics {
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const statsMap = new Map(projectStats.map((s) => [s.project_id, s]));

  const scopedIds =
    projectId === 'all'
      ? projects.map((p) => p.id)
      : projects.filter((p) => p.id === projectId).map((p) => p.id);

  const scopedStats = scopedIds.map(
    (id) => statsMap.get(id) ?? emptyStat(id),
  );

  let runs = 0;
  let completed = 0;
  let failed = 0;
  let decisions = 0;
  let aceitos = 0;
  let rejeitados = 0;
  let naoAplicavel = 0;

  for (const row of scopedStats) {
    runs += Number(row.runs) || 0;
    completed += Number(row.completed) || 0;
    failed += Number(row.failed) || 0;
    decisions += Number(row.decisions) || 0;
    aceitos += Number(row.aceitos) || 0;
    rejeitados += Number(row.rejeitados) || 0;
    naoAplicavel += Number(row.nao_aplicavel) || 0;
  }

  const weekMap = new Map<string, WeekPoint>();
  for (const row of weekly) {
    if (projectId !== 'all' && row.project_id !== projectId) continue;
    if (projectId === 'all' && !projectMap.has(row.project_id)) continue;
    const key = weekKey(row.week_start);
    const prev = weekMap.get(key) ?? {
      week: key,
      label: weekLabel(key),
      runs: 0,
      aceitos: 0,
      rejeitados: 0,
    };
    prev.runs += Number(row.runs) || 0;
    prev.aceitos += Number(row.aceitos) || 0;
    prev.rejeitados += Number(row.rejeitados) || 0;
    weekMap.set(key, prev);
  }
  const byWeek = [...weekMap.values()].sort((a, b) =>
    a.week.localeCompare(b.week),
  );

  const byProject: ProjectPoint[] = scopedIds
    .map((id) => {
      const project = projectMap.get(id);
      const stat = statsMap.get(id) ?? emptyStat(id);
      return {
        id,
        slug: project?.slug ?? id.slice(0, 8),
        name: project?.name ?? 'Projeto',
        runs: Number(stat.runs) || 0,
        aceitos: Number(stat.aceitos) || 0,
        rejeitados: Number(stat.rejeitados) || 0,
        decisions: Number(stat.decisions) || 0,
        acceptanceRate:
          stat.acceptance_rate == null
            ? acceptanceFromCounts(
                Number(stat.aceitos) || 0,
                Number(stat.rejeitados) || 0,
              )
            : Number(stat.acceptance_rate),
      };
    })
    .sort((a, b) => b.runs - a.runs || b.decisions - a.decisions);

  const bySource: NamedCount[] =
    runs > 0 ? [{ name: 'ci', count: runs }] : [];
  const byStatus: NamedCount[] = [
    { name: 'completed', count: completed },
    { name: 'failed', count: failed },
  ].filter((row) => row.count > 0);

  return {
    runs,
    completed,
    failed,
    decisions,
    aceitos,
    rejeitados,
    naoAplicavel,
    acceptanceRate: acceptanceFromCounts(aceitos, rejeitados),
    byWeek,
    byProject,
    bySource,
    byStatus,
    byVerdict: [
      { name: 'aceito', count: aceitos },
      { name: 'rejeitado', count: rejeitados },
      { name: 'nao-aplicavel', count: naoAplicavel },
    ].filter((row) => row.count > 0),
  };
}
