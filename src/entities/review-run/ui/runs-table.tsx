'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import type { Project, ReviewRun } from '@/entities/project';
import { RunDetailModal } from '@/entities/review-run/ui/run-detail-modal';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { githubPullRequestUrl } from '@/shared/lib/github';

const PAGE_SIZE = 10;
const ALL = 'all' as const;

type VerdictFilter = typeof ALL | 'aceito' | 'rejeitado' | 'none';
type SortKey = 'newest' | 'oldest';

const selectClass =
  'h-10 rounded-hd-md border border-hd-border bg-hd-canvas px-2.5 text-sm text-hd-text-strong';

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

function verdictCount(run: ReviewRun, verdict: string): number {
  return run.meta?.by_verdict?.[verdict] ?? 0;
}

function matchesQuery(run: ReviewRun, q: string): boolean {
  if (!q) return true;
  const author = prAuthor(run);
  const hay = [
    branchLabel(run),
    run.git_sha,
    run.review_slug,
    author,
    run.pr_number != null ? String(run.pr_number) : null,
    ...prReviewers(run),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function matchesVerdict(run: ReviewRun, verdict: VerdictFilter): boolean {
  if (verdict === ALL) return true;
  const by = run.meta?.by_verdict;
  if (verdict === 'none') {
    return !by || Object.keys(by).length === 0;
  }
  return verdictCount(run, verdict) > 0;
}

function filterAndSort(
  runs: ReviewRun[],
  query: string,
  author: string,
  verdict: VerdictFilter,
  sort: SortKey,
): ReviewRun[] {
  const q = query.trim().toLowerCase();
  const list = runs.filter((run) => {
    if (!matchesQuery(run, q)) return false;
    if (author !== ALL && prAuthor(run)?.toLowerCase() !== author) return false;
    if (!matchesVerdict(run, verdict)) return false;
    return true;
  });

  list.sort((a, b) => {
    const ta = new Date(a.started_at).getTime();
    const tb = new Date(b.started_at).getTime();
    return sort === 'oldest' ? ta - tb : tb - ta;
  });

  return list;
}

function uniqueAuthors(runs: ReviewRun[]): string[] {
  const set = new Set<string>();
  for (const run of runs) {
    const author = prAuthor(run);
    if (author) set.add(author);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
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
  const [query, setQuery] = useState('');
  const [author, setAuthor] = useState<string>(ALL);
  const [verdict, setVerdict] = useState<VerdictFilter>(ALL);
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  const authors = useMemo(() => uniqueAuthors(runs), [runs]);

  const filtered = useMemo(
    () => filterAndSort(runs, query, author, verdict, sort),
    [runs, query, author, verdict, sort],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRuns = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  if (runs.length === 0) {
    return (
      <EmptyState
        title="Nenhum run de CI"
        description="Só entram runs remotos (CI) após merge do PR. Testes locais não alimentam a memória."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-hd-xl border border-hd-border bg-hd-canvas p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="relative min-w-0 flex-1 space-y-1 text-xs font-medium text-hd-muted">
          Buscar
          <span className="relative mt-1 block">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hd-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => updateFilter(setQuery, e.target.value)}
              placeholder="Branch, autor, PR ou sha…"
              className="h-10 w-full rounded-hd-md border border-hd-border bg-hd-canvas py-2 pl-9 pr-3 text-sm text-hd-text-strong outline-none focus:border-hd-primary/50 focus:ring-2 focus:ring-hd-primary/20"
            />
          </span>
        </label>

        <label className="space-y-1 text-xs font-medium text-hd-muted">
          Autor
          <select
            className={`${selectClass} mt-1 block w-full sm:w-44`}
            value={author}
            onChange={(e) => updateFilter(setAuthor, e.target.value)}
          >
            <option value={ALL}>todos</option>
            {authors.map((login) => (
              <option key={login} value={login.toLowerCase()}>
                @{login}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-hd-muted">
          Veredito
          <select
            className={`${selectClass} mt-1 block w-full sm:w-40`}
            value={verdict}
            onChange={(e) =>
              updateFilter(setVerdict, e.target.value as VerdictFilter)
            }
          >
            <option value={ALL}>todos</option>
            <option value="aceito">com aceito</option>
            <option value="rejeitado">com rejeitado</option>
            <option value="none">sem vereditos</option>
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-hd-muted">
          Ordenar
          <select
            className={`${selectClass} mt-1 block w-full sm:w-40`}
            value={sort}
            onChange={(e) => updateFilter(setSort, e.target.value as SortKey)}
          >
            <option value="newest">mais recentes</option>
            <option value="oldest">mais antigos</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-hd-muted">
        {filtered.length} de {runs.length} run{runs.length === 1 ? '' : 's'}
        {filtered.length > PAGE_SIZE
          ? ` · página ${safePage} de ${totalPages}`
          : null}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum run com esses filtros"
          description="Ajuste a busca ou limpe os filtros."
        />
      ) : (
        <>
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
                {pageRuns.map((run) => {
                  const prUrl = githubPullRequestUrl(project, run.pr_number);
                  const runAuthor = prAuthor(run);
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
                        {runAuthor ? (
                          <div>
                            <span className="font-mono text-xs font-semibold text-hd-ink">
                              @{runAuthor}
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
                            <span className="font-mono text-xs">
                              #{run.pr_number}
                            </span>
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

          {totalPages > 1 ? (
            <nav
              className="flex flex-wrap items-center justify-between gap-3"
              aria-label="Paginação dos review runs"
            >
              <p className="text-xs text-hd-muted">
                Mostrando {pageStart + 1}–
                {Math.min(pageStart + PAGE_SIZE, filtered.length)} de{' '}
                {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  Anterior
                </Button>
                <span className="min-w-16 text-center text-xs font-medium text-hd-muted">
                  {safePage} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  Próxima
                </Button>
              </div>
            </nav>
          ) : null}
        </>
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
