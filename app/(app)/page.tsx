import {
  findProjectHealth,
  getRegistryHealth,
  listLinkedProjects,
  summarizeLinkedProjects,
} from '@/entities/linked-project';
import { LinkedProjectCard } from '@/entities/linked-project/ui/project-card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Card } from '@/shared/ui/card';

function formatWhen(iso: string | null) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function HomePage() {
  const projects = listLinkedProjects();
  const summary = summarizeLinkedProjects(projects);
  const health = getRegistryHealth();
  const recent = projects.slice(0, 6);
  const unhealthy = health.projects.filter((p) => !p.ok).length;

  return (
    <div className="space-y-6">
      <section className="sa-page-mesh overflow-hidden rounded-sa-2xl border border-sa-border bg-sa-canvas px-5 py-7 shadow-sa-md md:px-8 md:py-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sa-primary">
          Neste computador
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Repositórios ligados
        </h1>
        <p className="mt-2 max-w-2xl text-sa-secondary md:text-base">
          Projetos registrados pelo bootstrap do Cursor neste máquina.
          Ligar ou desligar symlinks continua na CLI.
        </p>
      </section>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Ligados', summary.total],
          ['Pasta ausente', summary.missing],
          [
            'Máquina',
            health.machine.ok
              ? 'ok'
              : health.machine.issues.join(', ') || 'aviso',
          ],
          ['Com aviso', unhealthy],
        ].map(([label, value]) => (
          <Card key={label as string} className="p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-sa-muted">
              {label}
            </dt>
            <dd className="mt-1 text-lg font-semibold text-sa-ink">{value}</dd>
          </Card>
        ))}
      </dl>
      <p className="text-xs text-sa-muted">
        Último link: {formatWhen(summary.lastLinked)}
      </p>

      {recent.length === 0 ? (
        <EmptyState
          title="Nenhum repositório ainda"
          description="npm run bootstrap -- caminho/do/repo registra o projeto no dashboard."
        />
      ) : (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-sa-ink">Recentes</h2>
          <ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((project) => (
              <li key={project.slug} className="h-full">
                <LinkedProjectCard
                  project={project}
                  health={findProjectHealth(health, project.path)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
