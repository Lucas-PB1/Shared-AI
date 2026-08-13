'use client';

import { useState } from 'react';

import type { Project, ReviewRun } from '@/entities/project';
import { RunDetailModal } from '@/entities/review-run/ui/run-detail-modal';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/empty-state';
import { githubPullRequestUrl } from '@/shared/lib/github';

function branchLabel(run: ReviewRun) {
  if (run.branch) return run.branch;
  if (run.review_slug) return run.review_slug;
  if (run.pr_number) return `PR #${run.pr_number}`;
  return '—';
}

function prAuthor(run: ReviewRun): string | null {
  const login = (run.pr_author ?? run.meta?.pr_author)?.trim();
  return login || null;
}

function prReviewers(run: ReviewRun): string[] {
  if (Array.isArray(run.reviewers) && run.reviewers.length > 0) {
    return run.reviewers;
  }
  return run.meta?.reviewers ?? [];
}

function prAuthorIsBot(run: ReviewRun): boolean {
  return Boolean(run.pr_author_is_bot ?? run.meta?.pr_author_is_bot);
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
  const [selected, setSelected] = useState<ReviewRun | null>(null);

  return (
    <div className="space-y-4">
      {runs.length === 0 ? (
        <EmptyState
          title="Nenhum run de CI"
          description="Só entram runs remotos (CI) após merge do PR. Testes locais não alimentam a memória."
        />
      ) : (
        <div className="overflow-x-auto rounded-hd-xl border border-hd-border bg-hd-canvas">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-hd-border bg-hd-surface text-hd-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium">Autor</th>
                <th className="px-4 py-3 font-medium">PR</th>
                <th className="px-4 py-3 font-medium">Vereditos</th>
                <th className="px-4 py-3 font-medium">Início</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const prUrl = githubPullRequestUrl(project, run.pr_number);
                const author = prAuthor(run);
                const reviewers = prReviewers(run);
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
                      <span className="font-mono text-xs font-semibold text-hd-ink group-hover:text-hd-primary group-hover:underline">
                        {branchLabel(run)}
                      </span>
                      {run.git_sha ? (
                        <p className="mt-0.5 font-mono text-[11px] text-hd-muted">
                          {run.git_sha.slice(0, 7)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {author ? (
                        <div>
                          <span className="font-mono text-xs font-semibold text-hd-ink">
                            @{author}
                          </span>
                          {prAuthorIsBot(run) ? (
                            <Badge className="ml-1.5 normal-case tracking-normal bg-hd-surface text-hd-muted">
                              bot
                            </Badge>
                          ) : null}
                          {reviewers.length > 0 ? (
                            <p className="mt-0.5 text-[11px] text-hd-muted">
                              rev. {reviewers.map((r) => `@${r}`).join(' ')}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span
                          className="text-hd-muted"
                          title="Disponível após re-ingest do PR"
                        >
                          —
                        </span>
                      )}
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
