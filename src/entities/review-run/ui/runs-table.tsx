'use client';

import { useState } from 'react';
import { useQueryStates, parseAsString } from 'nuqs';

import type { Project, ReviewRun } from '@/entities/project';
import { RunDetailModal } from '@/entities/review-run/ui/run-detail-modal';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { githubPullRequestUrl } from '@/shared/lib/github';

const STATUS_OPTIONS = ['', 'running', 'completed', 'failed', 'cancelled'] as const;
const SOURCE_OPTIONS = ['', 'local', 'ci', 'pre_commit', 'agent'] as const;

function branchLabel(run: ReviewRun) {
  if (run.branch) return run.branch;
  if (run.review_slug) return run.review_slug;
  if (run.pr_number) return `PR #${run.pr_number}`;
  return '—';
}

function VerdictSummary({ run }: { run: ReviewRun }) {
  const by = run.meta?.by_verdict;
  if (!by || Object.keys(by).length === 0) return <span className="text-hd-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {Object.entries(by).map(([verdict, count]) => (
        <Badge
          key={verdict}
          className={
            verdict === 'rejeitado'
              ? 'normal-case tracking-normal bg-red-50 text-hd-danger'
              : verdict === 'aceito'
                ? 'normal-case tracking-normal bg-emerald-50 text-emerald-700'
                : 'normal-case tracking-normal'
          }
        >
          {verdict} {count}
        </Badge>
      ))}
    </span>
  );
}

export function RunsTable({
  runs,
  project,
}: {
  runs: ReviewRun[];
  project: Project;
}) {
  const [filters, setFilters] = useQueryStates({
    status: parseAsString.withDefault(''),
    source: parseAsString.withDefault(''),
  });
  const [selected, setSelected] = useState<ReviewRun | null>(null);

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
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium">PR</th>
                <th className="px-4 py-3 font-medium">Vereditos</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Início</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((run) => {
                const prUrl = githubPullRequestUrl(project, run.pr_number);
                return (
                  <tr
                    key={run.id}
                    className="group cursor-pointer border-b border-hd-border last:border-0 hover:bg-hd-primary-soft/40 focus-visible:bg-hd-primary-soft/40 focus-visible:outline-none"
                    onClick={() => setSelected(run)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelected(run);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Abrir artefatos do run ${branchLabel(run)}`}
                  >
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
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-hd-ink group-hover:text-hd-primary group-hover:underline">
                        {branchLabel(run)}
                      </span>
                      {run.meta?.pr_author ? (
                        <p className="mt-0.5 text-[11px] text-hd-muted">
                          por @{run.meta.pr_author}
                          {run.meta.reviewers && run.meta.reviewers.length > 0
                            ? ` · rev. ${run.meta.reviewers.map((r) => `@${r}`).join(' ')}`
                            : ''}
                        </p>
                      ) : run.git_sha ? (
                        <p className="mt-0.5 font-mono text-[11px] text-hd-muted">
                          {run.git_sha.slice(0, 7)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {run.pr_number ? (
                        prUrl ? (
                          <a
                            href={prUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-hd-primary no-underline hover:underline"
                            title="Abrir PR no GitHub (também se já estiver fechado/mergeado)"
                            onClick={(e) => e.stopPropagation()}
                          >
                            #{run.pr_number}
                            <span aria-hidden>↗</span>
                          </a>
                        ) : (
                          <span className="font-mono text-xs">#{run.pr_number}</span>
                        )
                      ) : (
                        <span className="text-hd-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <VerdictSummary run={run} />
                    </td>
                    <td className="px-4 py-3">{run.source}</td>
                    <td className="px-4 py-3 text-hd-muted">
                      {new Date(run.started_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <RunDetailModal
        project={project}
        run={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
