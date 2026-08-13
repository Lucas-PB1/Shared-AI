'use client';

import { useState } from 'react';

import { EmptyState } from '@/shared/ui/empty-state';

import { computeDashboardMetrics } from '../model/aggregate';
import type { DashboardSnapshot } from '../model/types';
import {
  KpiGrid,
  ProjectMetricsChart,
  RunsOverTimeChart,
  VerdictPieChart,
} from './dashboard-charts';

const ALL = 'all' as const;

export function DashboardPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [projectId, setProjectId] = useState<string>(ALL);

  if (snapshot.projects.length === 0) {
    return (
      <EmptyState
        title="Nenhum projeto no seu acesso"
        description="Quando você tiver projetos, os gráficos de desempenho aparecem aqui."
      />
    );
  }

  const selected =
    projectId === ALL
      ? null
      : (snapshot.projects.find((p) => p.id === projectId) ?? null);
  const scope = selected?.id ?? ALL;

  const metrics = computeDashboardMetrics(
    snapshot.projects,
    snapshot.projectStats,
    snapshot.weekly,
    scope,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-hd-xl border border-hd-border bg-hd-canvas p-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="space-y-1 text-xs font-medium text-hd-muted">
          Escopo
          <select
            className="mt-1 block h-10 w-full min-w-56 rounded-hd-md border border-hd-border bg-hd-canvas px-2.5 text-sm text-hd-text-strong sm:w-80"
            value={scope}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value={ALL}>Geral</option>
            {snapshot.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <p className="font-mono text-xs text-hd-muted sm:pb-2">
          {selected ? selected.slug : 'todos os projetos'}
        </p>
      </div>

      <KpiGrid metrics={metrics} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RunsOverTimeChart data={metrics.byWeek} />
        <VerdictPieChart data={metrics.byVerdict} />
        <ProjectMetricsChart metrics={metrics} />
      </div>
    </div>
  );
}
