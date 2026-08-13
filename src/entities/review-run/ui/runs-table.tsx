'use client';

import { useQueryStates, parseAsString } from 'nuqs';

import type { ReviewRun } from '@/entities/project';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';

const STATUS_OPTIONS = ['', 'running', 'completed', 'failed', 'cancelled'] as const;
const SOURCE_OPTIONS = ['', 'local', 'ci', 'pre_commit', 'agent'] as const;

export function RunsTable({ runs }: { runs: ReviewRun[] }) {
  const [filters, setFilters] = useQueryStates({
    status: parseAsString.withDefault(''),
    source: parseAsString.withDefault(''),
  });

  const filtered = runs.filter((run) => {
    if (filters.status && run.status !== filters.status) return false;
    if (filters.source && run.source !== filters.source) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-hd-muted">
          Status
          <select
            className="h-9 rounded-hd-md border border-hd-border bg-hd-canvas px-2 text-sm text-hd-text-strong"
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value || 'all'} value={value}>
                {value || 'todos'}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-hd-muted">
          Source
          <select
            className="h-9 rounded-hd-md border border-hd-border bg-hd-canvas px-2 text-sm text-hd-text-strong"
            value={filters.source}
            onChange={(e) => setFilters({ source: e.target.value })}
          >
            {SOURCE_OPTIONS.map((value) => (
              <option key={value || 'all'} value={value}>
                {value || 'todos'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum run"
          description="Ainda não há execuções de review neste projeto (ou o filtro está vazio)."
        />
      ) : (
        <div className="overflow-x-auto rounded-hd-xl border border-hd-border bg-hd-canvas">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-hd-border bg-hd-surface text-hd-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">SHA</th>
                <th className="px-4 py-3 font-medium">Início</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((run) => (
                <tr key={run.id} className="border-b border-hd-border last:border-0">
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        run.status === 'failed'
                          ? 'bg-red-50 text-hd-danger'
                          : run.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : undefined
                      }
                    >
                      {run.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{run.source}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {run.branch ?? '—'}
                    {run.pr_number ? ` · PR #${run.pr_number}` : ''}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {run.git_sha ? run.git_sha.slice(0, 7) : '—'}
                  </td>
                  <td className="px-4 py-3 text-hd-muted">
                    {new Date(run.started_at).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
