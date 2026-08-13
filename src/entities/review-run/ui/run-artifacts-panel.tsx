'use client';

import { useState } from 'react';

import type {
  Decision,
  DecisionComment,
  Project,
  ReviewRun,
} from '@/entities/project';
import {
  ArtifactItemList,
  type ArtifactItem,
} from '@/entities/review-run/ui/artifact-browser';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/lib/cn';
import { githubPullRequestUrl } from '@/shared/lib/github';

type VerdictTab = 'aceito' | 'rejeitado' | 'outro';

function decisionComments(meta: Decision['meta']): ArtifactItem['comments'] {
  const raw = meta?.comments;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return (raw as DecisionComment[]).map((c) => ({
    author: c.login,
    kind: c.kind === 'bot' || c.is_bot ? 'bot' : 'human',
    body: c.body,
    role: c.role,
  }));
}

function authorFromDecision(d: Decision): {
  authorLabel: string | null;
  authorKind: ArtifactItem['authorKind'];
} {
  const meta = d.meta;
  if (meta?.decided_by_login) {
    return {
      authorLabel: `@${meta.decided_by_login}`,
      authorKind: meta.decided_by_kind === 'auto' ? 'auto' : 'human',
    };
  }
  if (meta?.root_kind === 'bot' || meta?.root_is_bot) {
    return {
      authorLabel: meta.root_author || 'avaliar',
      authorKind: 'bot',
    };
  }
  if (meta?.root_author) {
    return { authorLabel: `@${meta.root_author}`, authorKind: 'human' };
  }
  if (d.decided_by && !d.decided_by.startsWith('review-ingest')) {
    return { authorLabel: `@${d.decided_by}`, authorKind: 'human' };
  }
  return { authorLabel: null, authorKind: null };
}

function toItems(
  decisions: Decision[],
  verdict: VerdictTab,
): ArtifactItem[] {
  return decisions
    .filter((d) =>
      verdict === 'outro'
        ? d.verdict !== 'aceito' && d.verdict !== 'rejeitado'
        : d.verdict === verdict,
    )
    .map((d) => {
      const { authorLabel, authorKind } = authorFromDecision(d);
      return {
        id: d.id,
        title: d.summary || d.finding_key,
        subtitle: [d.finding_key, d.file_path].filter(Boolean).join(' · '),
        badge: d.verdict,
        badgeTone:
          d.verdict === 'aceito'
            ? 'ok'
            : d.verdict === 'rejeitado'
              ? 'danger'
              : 'default',
        detail: d.reason,
        authorLabel,
        authorKind,
        comments: decisionComments(d.meta),
      };
    });
}

function DecisionTabs({ decisions }: { decisions: Decision[] }) {
  const aceitos = toItems(decisions, 'aceito');
  const rejeitados = toItems(decisions, 'rejeitado');
  const outros = toItems(decisions, 'outro');

  const initial: VerdictTab =
    aceitos.length > 0 ? 'aceito' : rejeitados.length > 0 ? 'rejeitado' : 'outro';
  const [tab, setTab] = useState<VerdictTab>(initial);

  const tabs: { id: VerdictTab; label: string; count: number; tone: string }[] =
    [
      {
        id: 'aceito',
        label: 'Aceitos',
        count: aceitos.length,
        tone: 'primary',
      },
      {
        id: 'rejeitado',
        label: 'Rejeitados',
        count: rejeitados.length,
        tone: 'danger',
      },
      ...(outros.length > 0
        ? [
            {
              id: 'outro' as const,
              label: 'Outros',
              count: outros.length,
              tone: 'neutral',
            },
          ]
        : []),
    ];

  const activeItems =
    tab === 'aceito' ? aceitos : tab === 'rejeitado' ? rejeitados : outros;

  return (
    <div className="space-y-3">
      <p className="text-xs text-hd-muted">
        Clique em Aceitos ou Rejeitados para ver a lista — cada item marca bot vs pessoa
      </p>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
        }}
        role="tablist"
        aria-label="Vereditos do run"
      >
        {tabs.map((t) => {
          const selected = tab === t.id;
          const empty = t.count === 0;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={empty}
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-hd-xl border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hd-primary/40',
                empty && 'cursor-not-allowed opacity-45',
                !empty && 'cursor-pointer hover:shadow-sm',
                selected &&
                  t.tone === 'primary' &&
                  'border-hd-primary bg-hd-primary text-white shadow-sm',
                selected &&
                  t.tone === 'danger' &&
                  'border-hd-danger bg-red-50 text-hd-danger shadow-sm ring-1 ring-hd-danger/20',
                selected &&
                  t.tone === 'neutral' &&
                  'border-hd-ink/20 bg-hd-surface text-hd-ink shadow-sm',
                !selected &&
                  t.tone === 'primary' &&
                  'border-hd-primary/30 bg-hd-primary-soft text-hd-ink hover:border-hd-primary',
                !selected &&
                  t.tone === 'danger' &&
                  'border-red-200 bg-red-50/60 text-hd-ink hover:border-hd-danger',
                !selected &&
                  t.tone === 'neutral' &&
                  'border-hd-border bg-hd-canvas text-hd-ink hover:border-hd-primary/40',
              )}
            >
              <span
                className={cn(
                  'block text-[10px] font-bold uppercase tracking-wide',
                  selected && t.tone === 'primary'
                    ? 'text-white/85'
                    : 'text-hd-muted',
                  selected && t.tone === 'danger' && 'text-hd-danger',
                )}
              >
                {t.label}
              </span>
              <span className="mt-0.5 block text-2xl font-semibold leading-none">
                {t.count}
              </span>
              {!empty ? (
                <span
                  className={cn(
                    'mt-1.5 block text-[11px] font-medium',
                    selected && t.tone === 'primary'
                      ? 'text-white/90'
                      : 'text-hd-primary',
                    selected && t.tone === 'danger' && 'text-hd-danger',
                  )}
                >
                  {selected ? 'Lista abaixo ↓' : 'Ver lista →'}
                </span>
              ) : (
                <span className="mt-1.5 block text-[11px] text-hd-muted">
                  Vazio
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        <ArtifactItemList
          items={activeItems}
          emptyText="Nenhuma decisão neste grupo"
        />
      </div>
    </div>
  );
}

function PrPeople({ run }: { run: ReviewRun }) {
  const author = run.meta?.pr_author;
  const reviewers = run.meta?.reviewers ?? [];
  if (!author && reviewers.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-hd-md border border-hd-border bg-hd-surface/40 px-3 py-2.5 text-xs">
      {author ? (
        <p>
          <span className="font-semibold text-hd-muted">Autor do PR </span>
          <span className="font-mono font-semibold text-hd-ink">@{author}</span>
          {run.meta?.pr_author_is_bot ? (
            <Badge className="ml-2 normal-case tracking-normal bg-hd-surface text-hd-muted">
              bot
            </Badge>
          ) : null}
        </p>
      ) : null}
      {reviewers.length > 0 ? (
        <p>
          <span className="font-semibold text-hd-muted">Avaliaram </span>
          {reviewers.map((login) => (
            <Badge
              key={login}
              className="mr-1 normal-case tracking-normal bg-sky-50 text-sky-800"
            >
              @{login}
            </Badge>
          ))}
        </p>
      ) : (
        <p className="text-hd-muted">Nenhum revisor humano capturado neste run</p>
      )}
    </div>
  );
}

export function RunArtifactsSummary({
  project,
  run,
  decisions,
}: {
  project: Project;
  run: ReviewRun;
  decisions: Decision[];
}) {
  const refLabel =
    run.branch ||
    run.review_slug ||
    (run.pr_number ? `PR #${run.pr_number}` : run.id.slice(0, 8));
  const prUrl = githubPullRequestUrl(project, run.pr_number);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-sm font-semibold text-hd-ink">{refLabel}</p>
        <Badge
          className={
            run.status === 'completed'
              ? 'bg-emerald-50 text-emerald-700'
              : run.status === 'failed'
                ? 'bg-red-50 text-hd-danger'
                : undefined
          }
        >
          {run.status}
        </Badge>
        <Badge className="normal-case tracking-normal">{run.source}</Badge>
        {run.pr_number ? (
          prUrl ? (
            <a
              href={prUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-hd-primary no-underline hover:underline"
              title="PR no GitHub — funciona mesmo fechado ou mergeado"
            >
              PR #{run.pr_number} ↗
            </a>
          ) : (
            <Badge className="normal-case tracking-normal">
              PR #{run.pr_number}
            </Badge>
          )
        ) : null}
      </div>
      <p className="text-xs text-hd-muted">
        {run.branch ? (
          <>
            Branch <span className="font-mono text-hd-ink">{run.branch}</span>
          </>
        ) : (
          'Sem branch gravada no store'
        )}
        {run.git_sha ? (
          <>
            {' '}
            · SHA <span className="font-mono">{run.git_sha.slice(0, 7)}</span>
          </>
        ) : null}
        {' · '}
        {new Date(run.started_at).toLocaleString('pt-BR')}
      </p>
      <PrPeople run={run} />
      <DecisionTabs key={run.id} decisions={decisions} />
    </div>
  );
}
