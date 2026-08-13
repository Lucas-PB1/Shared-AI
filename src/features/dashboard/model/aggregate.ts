import type {
  DashboardDecision,
  DashboardMetrics,
  DashboardProject,
  DashboardRun,
  NamedCount,
  ProjectPoint,
  WeekPoint,
} from './types';

function weekKey(iso: string): { key: string; label: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { key: 'invalid', label: '?' };
  }
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + mondayOffset),
  );
  const key = monday.toISOString().slice(0, 10);
  const label = monday.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
  return { key, label };
}

function countBy(values: string[]): NamedCount[] {
  const map = new Map<string, number>();
  for (const value of values) {
    const name = value || '—';
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeDashboardMetrics(
  projects: DashboardProject[],
  runs: DashboardRun[],
  decisions: DashboardDecision[],
  projectId: string | 'all' = 'all',
): DashboardMetrics {
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const filteredRuns =
    projectId === 'all'
      ? runs
      : runs.filter((r) => r.project_id === projectId);
  const filteredDecisions =
    projectId === 'all'
      ? decisions
      : decisions.filter((d) => d.project_id === projectId);

  const aceitos = filteredDecisions.filter((d) => d.verdict === 'aceito').length;
  const rejeitados = filteredDecisions.filter(
    (d) => d.verdict === 'rejeitado',
  ).length;
  const naoAplicavel = filteredDecisions.filter(
    (d) => d.verdict === 'nao-aplicavel',
  ).length;
  const decided = aceitos + rejeitados;
  const acceptanceRate =
    decided > 0 ? Math.round((aceitos / decided) * 1000) / 10 : null;

  const weekMap = new Map<string, WeekPoint>();
  for (const run of filteredRuns) {
    const { key, label } = weekKey(run.started_at);
    const row = weekMap.get(key) ?? {
      week: key,
      label,
      runs: 0,
      aceitos: 0,
      rejeitados: 0,
    };
    row.runs += 1;
    weekMap.set(key, row);
  }
  for (const decision of filteredDecisions) {
    const { key, label } = weekKey(decision.finalized_at);
    const row = weekMap.get(key) ?? {
      week: key,
      label,
      runs: 0,
      aceitos: 0,
      rejeitados: 0,
    };
    if (decision.verdict === 'aceito') row.aceitos += 1;
    if (decision.verdict === 'rejeitado') row.rejeitados += 1;
    weekMap.set(key, row);
  }
  const byWeek = [...weekMap.values()].sort((a, b) =>
    a.week.localeCompare(b.week),
  );

  const projectIds =
    projectId === 'all'
      ? projects.map((p) => p.id)
      : projects.filter((p) => p.id === projectId).map((p) => p.id);

  const byProject: ProjectPoint[] = projectIds.map((id) => {
    const project = projectMap.get(id);
    const pRuns = filteredRuns.filter((r) => r.project_id === id);
    const pDecisions = filteredDecisions.filter((d) => d.project_id === id);
    const pAceitos = pDecisions.filter((d) => d.verdict === 'aceito').length;
    const pRejeitados = pDecisions.filter(
      (d) => d.verdict === 'rejeitado',
    ).length;
    const pDecided = pAceitos + pRejeitados;
    return {
      id,
      slug: project?.slug ?? id.slice(0, 8),
      name: project?.name ?? 'Projeto',
      runs: pRuns.length,
      aceitos: pAceitos,
      rejeitados: pRejeitados,
      decisions: pDecisions.length,
      acceptanceRate:
        pDecided > 0
          ? Math.round((pAceitos / pDecided) * 1000) / 10
          : null,
    };
  }).sort((a, b) => b.runs - a.runs || b.decisions - a.decisions);

  return {
    runs: filteredRuns.length,
    completed: filteredRuns.filter((r) => r.status === 'completed').length,
    failed: filteredRuns.filter((r) => r.status === 'failed').length,
    decisions: filteredDecisions.length,
    aceitos,
    rejeitados,
    naoAplicavel,
    acceptanceRate,
    byWeek,
    byProject,
    bySource: countBy(filteredRuns.map((r) => r.source)),
    byStatus: countBy(filteredRuns.map((r) => r.status)),
    byVerdict: [
      { name: 'aceito', count: aceitos },
      { name: 'rejeitado', count: rejeitados },
      { name: 'nao-aplicavel', count: naoAplicavel },
    ].filter((row) => row.count > 0),
  };
}
