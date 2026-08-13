'use client';

import type { Convention, Decision, Exclusion } from '@/entities/project';
import { ArtifactBrowser } from '@/entities/review-run/ui/artifact-browser';
import { Card } from '@/shared/ui/card';

export function ProjectMemoryPanel({
  exclusions,
  conventions,
  accepted,
}: {
  exclusions: Exclusion[];
  conventions: Convention[];
  accepted: Decision[];
}) {
  return (
    <Card className="space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold text-hd-ink">Memória</h2>
        <p className="text-xs text-hd-muted">
          Clique no grupo para abrir a lista
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <ArtifactBrowser
          layout="row"
          label="Exclusões"
          count={exclusions.length}
          tone="danger"
          description="Achados rejeitados que viraram política."
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
          description="Regras na tabela conventions."
          emptyText="Tabela conventions vazia"
          items={conventions.map((item) => ({
            id: item.id,
            title: item.finding_key || 'convention',
            subtitle: item.scope_glob,
            detail: item.body,
          }))}
        />
        <ArtifactBrowser
          layout="row"
          label="Aceitos"
          count={accepted.length}
          tone="primary"
          description="Decisões aceitas do projeto."
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
