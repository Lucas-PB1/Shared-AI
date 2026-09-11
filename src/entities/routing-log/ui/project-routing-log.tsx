import type { RoutingLogEntry } from '@/entities/routing-log';
import { EmptyState } from '@/shared/ui/empty-state';
import { Badge } from '@/shared/ui/badge';

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const SOURCE_LABEL: Record<RoutingLogEntry['source'], string> = {
  agent: 'auto',
  'skills-why': 'skills-why',
  manual: 'manual',
};

export function ProjectRoutingLog({
  entries,
  logPath,
}: {
  entries: RoutingLogEntry[];
  logPath: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-sa-ink">
          Log de roteamento
        </h2>
        <p className="mt-1 text-sm text-sa-muted">
          Histórico local desta máquina (não vai para o git do projeto). Arquivo:{' '}
          <code className="text-sa-ink">{logPath}</code>
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="Nenhuma entrada ainda"
          description="Depois de tarefas de código, o agente grava skills usadas aqui automaticamente."
        />
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={`${entry.ts}-${entry.ask}-${entry.skills.join(',')}`}
              className="rounded-sa-xl border border-sa-border bg-sa-canvas px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <time
                  dateTime={entry.ts}
                  className="font-mono text-xs text-sa-muted"
                >
                  {formatWhen(entry.ts)}
                </time>
                <Badge className="normal-case tracking-normal">
                  {SOURCE_LABEL[entry.source]}
                </Badge>
              </div>
              {entry.ask ? (
                <p className="mt-2 text-sm text-sa-ink">{entry.ask}</p>
              ) : null}
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {entry.skills.map((skill) => (
                  <li key={skill}>
                    <span className="inline-flex rounded-sa-md bg-sa-primary-soft px-2 py-0.5 font-mono text-xs text-sa-primary-strong">
                      {skill}
                    </span>
                  </li>
                ))}
              </ul>
              {entry.excluded && entry.excluded.length > 0 ? (
                <p className="mt-2 text-xs text-sa-muted">
                  Excluídas: {entry.excluded.join(', ')}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
