'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { Badge } from '@/shared/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { cn } from '@/shared/lib/cn';

export type ArtifactComment = {
  author: string;
  kind: 'bot' | 'human';
  body: string;
  role?: 'root' | 'reply';
};

export type ArtifactItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  badgeTone?: 'default' | 'ok' | 'danger';
  detail?: string | null;
  /** Quem originou / decidiu — exibido ao lado do título */
  authorLabel?: string | null;
  authorKind?: 'bot' | 'human' | 'auto' | null;
  comments?: ArtifactComment[];
};

function toneClass(tone?: ArtifactItem['badgeTone']) {
  if (tone === 'ok') return 'normal-case tracking-normal bg-emerald-50 text-emerald-700';
  if (tone === 'danger') return 'normal-case tracking-normal bg-red-50 text-hd-danger';
  return 'normal-case tracking-normal';
}

function AuthorBadge({
  label,
  kind,
}: {
  label: string;
  kind?: 'bot' | 'human' | 'auto' | null;
}) {
  return (
    <Badge
      className={cn(
        'normal-case tracking-normal',
        kind === 'bot' && 'bg-hd-surface text-hd-muted',
        kind === 'human' && 'bg-sky-50 text-sky-800',
        kind === 'auto' && 'bg-amber-50 text-amber-800',
      )}
    >
      {kind === 'bot' ? `bot · ${label}` : label}
    </Badge>
  );
}

export function ExpandableItem({ item }: { item: ArtifactItem }) {
  const [open, setOpen] = useState(false);
  const hasComments = Boolean(item.comments?.length);
  const hasDetail = Boolean(item.detail?.trim());
  const canExpand = hasDetail || hasComments;

  return (
    <div className="border-b border-hd-border last:border-0">
      <button
        type="button"
        className={cn(
          'group flex w-full items-start gap-2 rounded-hd-md px-2 py-2.5 text-left transition-colors',
          canExpand
            ? 'cursor-pointer hover:bg-hd-primary-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hd-primary/40'
            : 'cursor-default',
        )}
        onClick={() => canExpand && setOpen((v) => !v)}
        aria-expanded={canExpand ? open : undefined}
        disabled={!canExpand}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                'text-sm font-medium text-hd-ink',
                canExpand && 'group-hover:text-hd-primary group-hover:underline',
              )}
            >
              {item.title}
            </p>
            {item.badge ? (
              <Badge className={toneClass(item.badgeTone)}>{item.badge}</Badge>
            ) : null}
            {item.authorLabel ? (
              <AuthorBadge label={item.authorLabel} kind={item.authorKind} />
            ) : null}
          </div>
          {item.subtitle ? (
            <p className="mt-0.5 font-mono text-[11px] text-hd-muted">
              {item.subtitle}
            </p>
          ) : null}
        </div>
        {canExpand ? (
          <ChevronDown
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 text-hd-muted transition-transform group-hover:text-hd-primary',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        ) : null}
      </button>
      {open ? (
        <div className="space-y-2 pb-2.5 pl-2 pr-2">
          {hasComments
            ? item.comments!.map((comment, index) => (
                <div
                  key={`${item.id}-c-${index}`}
                  className={cn(
                    'rounded-hd-md border px-3 py-2',
                    comment.kind === 'bot'
                      ? 'border-hd-border/80 bg-hd-surface/60'
                      : 'border-sky-100 bg-sky-50/50',
                  )}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <AuthorBadge
                      label={
                        comment.kind === 'bot'
                          ? comment.author
                          : `@${comment.author}`
                      }
                      kind={comment.kind}
                    />
                    <span className="text-[10px] uppercase tracking-wide text-hd-muted">
                      {comment.role === 'root'
                        ? comment.kind === 'bot'
                          ? 'comentário do bot'
                          : 'comentário inicial'
                        : 'resposta'}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-hd-secondary">
                    {comment.body || '—'}
                  </p>
                </div>
              ))
            : null}
          {hasDetail && !hasComments ? (
            <p className="whitespace-pre-wrap rounded-hd-md bg-hd-surface/70 px-3 py-2 text-sm text-hd-secondary">
              {item.detail}
            </p>
          ) : null}
          {hasDetail && hasComments ? (
            <p className="text-xs text-hd-muted">
              Motivo do veredito: {item.detail}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ArtifactItemList({
  items,
  emptyText = 'Nenhum item',
}: {
  items: ArtifactItem[];
  emptyText?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-hd-muted">{emptyText}</p>
    );
  }
  return (
    <div className="rounded-hd-md border border-hd-border">
      {items.map((item) => (
        <ExpandableItem key={item.id} item={item} />
      ))}
    </div>
  );
}

function countTone(tone: 'neutral' | 'primary' | 'ok' | 'danger') {
  if (tone === 'primary') return 'bg-hd-primary-soft text-hd-primary';
  if (tone === 'ok') return 'bg-emerald-50 text-emerald-700';
  if (tone === 'danger') return 'bg-red-50 text-hd-danger';
  return 'bg-hd-surface text-hd-secondary';
}

export function ArtifactBrowser({
  label,
  count,
  description,
  items,
  tone = 'neutral',
  emptyText = 'Nenhum item',
  layout = 'tile',
  className,
}: {
  label: string;
  count: number;
  description?: string;
  items: ArtifactItem[];
  tone?: 'neutral' | 'primary' | 'ok' | 'danger';
  emptyText?: string;
  layout?: 'tile' | 'row';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const empty = count === 0;

  return (
    <>
      {layout === 'row' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={empty}
          className={cn(
            'group flex w-full items-center gap-2 rounded-hd-md border border-hd-border bg-hd-canvas px-3 py-2.5 text-left transition-all',
            empty
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer hover:border-hd-primary/50 hover:bg-hd-primary-soft/70 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hd-primary/40',
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-hd-ink group-hover:text-hd-primary group-enabled:underline-offset-2 group-hover:underline">
            {label}
          </span>
          <span
            className={cn(
              'inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
              countTone(tone),
            )}
          >
            {count}
          </span>
          {!empty ? (
            <span className="hidden text-[11px] font-medium text-hd-primary sm:inline">
              Ver
            </span>
          ) : null}
          <ChevronRight
            className="h-4 w-4 shrink-0 text-hd-muted transition-transform group-hover:translate-x-0.5 group-hover:text-hd-primary"
            aria-hidden
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={empty}
          className={cn(
            'group flex min-h-[4.25rem] w-full flex-col justify-center rounded-hd-xl border px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45',
            !empty &&
              'cursor-pointer hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hd-primary/40',
            tone === 'primary' &&
              'border-hd-primary/25 bg-hd-primary-soft text-hd-ink hover:bg-hd-primary/15',
            tone === 'ok' &&
              'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
            tone === 'danger' &&
              'border-red-200 bg-red-50 text-red-900 hover:bg-red-100',
            tone === 'neutral' &&
              'border-hd-border bg-hd-canvas text-hd-ink hover:border-hd-primary/35 hover:bg-hd-primary-soft',
            className,
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-hd-muted">
            {label}
          </span>
          <span className="text-xl font-semibold leading-none">{count}</span>
          {!empty ? (
            <span className="mt-1 text-[10px] font-medium text-hd-primary opacity-0 transition-opacity group-hover:opacity-100">
              Abrir lista →
            </span>
          ) : null}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(100%-1.5rem,40rem)]">
          <DialogHeader>
            <DialogTitle>
              {label}{' '}
              <span className="font-normal text-hd-muted">({count})</span>
            </DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogBody className="max-h-[min(60vh,520px)]">
            <ArtifactItemList items={items} emptyText={emptyText} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
