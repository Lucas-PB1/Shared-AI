'use client';

import type { Convention, Decision, Exclusion } from '@/entities/project';
import { ArtifactBrowser } from '@/entities/review-run/ui/artifact-browser';
import {
  downloadCsv,
  downloadMarkdown,
  formatConventionsMarkdown,
} from '@/entities/review-run/lib/download-memory';
import { Card } from '@/shared/ui/card';

function evidenceIds(meta: Convention['meta']): string[] {
  const raw = meta?.evidence_decision_ids;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x ?? '').trim()).filter(Boolean);
}

function evidenceCount(meta: Convention['meta']): number {
  const n = Number(meta?.evidence_count);
  if (Number.isFinite(n) && n > 0) return n;
  return evidenceIds(meta).length;
}

function relatedPrs(meta: Convention['meta']): number[] {
  const raw = meta?.related_prs;
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ].sort((a, b) => a - b);
}

function absorbedKeys(meta: Convention['meta']): string[] {
  const raw = meta?.absorbed_finding_keys;
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((x) => String(x ?? '').trim()).filter(Boolean))];
}

function conventionDetail(
  item: Convention,
  acceptedById: Map<string, Decision>,
): string {
  const parts: string[] = [item.body.trim() || '—'];
  const ids = evidenceIds(item.meta);
  if (ids.length) {
    parts.push('', 'Evidências (decisions aceitas):');
    for (const id of ids) {
      const d = acceptedById.get(id);
      if (d) {
        parts.push(
          `• ${d.summary || d.finding_key} (${d.finding_key}${d.source ? ` · ${d.source}` : ''})`,
        );
      } else {
        parts.push(`• decision ${id.slice(0, 8)}…`);
      }
    }
  }
  const absorbed = absorbedKeys(item.meta);
  if (absorbed.length) {
    parts.push('', `Keys absorvidas: ${absorbed.join(', ')}`);
  }
  return parts.join('\n');
}

export function ProjectMemoryPanel({
  projectSlug,
  exclusions,
  conventions,
  accepted,
}: {
  projectSlug: string;
  exclusions: Exclusion[];
  conventions: Convention[];
  accepted: Decision[];
}) {
  const acceptedById = new Map(accepted.map((d) => [d.id, d]));

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold text-hd-ink">Memória</h2>
        <p className="text-xs text-hd-muted">
          Clique no grupo para abrir a lista · ícone baixa o arquivo
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <ArtifactBrowser
          layout="row"
          label="Exclusões"
          count={exclusions.length}
          tone="danger"
          description="Achados rejeitados que viraram política."
          onDownload={() =>
            downloadCsv(
              `${projectSlug}-exclusoes.csv`,
              [
                'finding_key',
                'scope_glob',
                'active',
                'occurrences',
                'reason',
                'source',
                'updated_at',
              ],
              exclusions.map((item) => ({
                finding_key: item.finding_key,
                scope_glob: item.scope_glob,
                active: item.active,
                occurrences: item.occurrences,
                reason: item.reason,
                source: item.source,
                updated_at: item.updated_at,
              })),
            )
          }
          items={exclusions.map((item) => ({
            id: item.id,
            title: item.finding_key,
            subtitle: item.scope_glob,
            badge: item.active ? 'ativa' : 'inativa',
            badgeTone: item.active ? 'ok' : 'default',
            detail: item.reason,
          }))}
        />
        <ArtifactBrowser
          layout="row"
          label="Conventions"
          count={conventions.length}
          description="Regras promovidas a partir de decisions aceitas (≥2)."
          emptyText="Tabela conventions vazia"
          onDownload={() =>
            downloadMarkdown(
              `${projectSlug}-convencoes.md`,
              formatConventionsMarkdown(
                projectSlug,
                conventions.map((item) => ({
                  finding_key: item.finding_key,
                  scope_glob: item.scope_glob,
                  body: item.body,
                  evidence_count: evidenceCount(item.meta),
                  related_prs: relatedPrs(item.meta),
                  absorbed_finding_keys: absorbedKeys(item.meta),
                })),
              ),
            )
          }
          items={conventions.map((item) => {
            const n = evidenceCount(item.meta);
            const prs = relatedPrs(item.meta);
            const subtitleParts = [item.scope_glob];
            if (prs.length) subtitleParts.push(`PR ${prs.join(', ')}`);
            return {
              id: item.id,
              title: item.finding_key || 'convention',
              subtitle: subtitleParts.join(' · '),
              badge: n > 0 ? `${n} evidências` : null,
              badgeTone: n >= 2 ? ('ok' as const) : ('default' as const),
              detail: conventionDetail(item, acceptedById),
            };
          })}
        />
        <ArtifactBrowser
          layout="row"
          label="Aceitos"
          count={accepted.length}
          tone="primary"
          description="Decisões aceitas do projeto."
          onDownload={() =>
            downloadCsv(
              `${projectSlug}-aceitos.csv`,
              [
                'id',
                'finding_key',
                'summary',
                'file_path',
                'source',
                'reason',
                'finalized_at',
              ],
              accepted.map((item) => ({
                id: item.id,
                finding_key: item.finding_key,
                summary: item.summary,
                file_path: item.file_path,
                source: item.source,
                reason: item.reason,
                finalized_at: item.finalized_at,
              })),
            )
          }
          items={accepted.map((item) => ({
            id: item.id,
            title: item.summary || item.finding_key,
            subtitle: [item.finding_key, item.file_path]
              .filter(Boolean)
              .join(' · '),
            badge: 'aceito',
            badgeTone: 'ok',
            detail: item.reason,
          }))}
        />
      </div>
    </Card>
  );
}
