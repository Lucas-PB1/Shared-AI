'use client';

import { useState } from 'react';

import { EmptyState } from '@/shared/ui/empty-state';

import { computeDashboardMetrics } from '../model/aggregate';
import type { DashboardSnapshot } from '../model/types';
import {
  KpiGrid,
  ProjectPerformanceChart,
  RunsOverTimeChart,
  VerdictPieChart,
} from './dashboard-charts';

export function DashboardPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [projectId, setProjectId] = useState<string>('all');

  if (snapshot.projects.length === 0) {
    return (
      <EmptyState
        title="Nenhum projeto no seu acesso"
        description="Quando você tiver projetos, os gráficos de desempenho aparecem aqui."
      />
    );
  }

  const metrics = computeDashboardMetrics(
    snapshot.projects,
    snapshot.runs,
    snapshot.decisions,
    projectId === 'all' ? 'all' : projectId,
  );

  const mode = projectId === 'all' ? 'all' : 'single';
  const selected =
    projectId === 'all'
      ? null
      : snapshot.projects.find((p) => p.id === projectId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-hd-xl border border-hd-border bg-hd-canvas p-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="space-y-1 text-xs font-medium text-hd-muted">
          Escopo
          <select
            className="mt-1 block h-10 w-full min-w-[14rem] rounded-hd-md border border-hd-border bg-hd-canvas px-2.5 text-sm text-hd-text-strong sm:w-72"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="all">Geral — todos os projetos</option>
            {snapshot.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-hd-muted sm:pb-2">
          {mode === 'all'
            ? `${snapshot.projects.length} projetos · visão consolidada`
            : `Projeto ${selected?.slug ?? ''}`}
        </p>
      </div>

      <KpiGrid metrics={metrics} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RunsOverTimeChart data={metrics.byWeek} />
        <VerdictPieChart data={metrics.byVerdict} />
        <ProjectPerformanceChart data={metrics.byProject} mode={mode} />
      </div>
    </div>
  );
}
