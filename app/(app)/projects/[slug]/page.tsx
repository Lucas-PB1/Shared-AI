import { notFound } from 'next/navigation';

import { getLinkedProjectBySlug } from '@/entities/linked-project/api';
import { unregisterLinkedProjectAction } from '@/entities/linked-project/actions';
import {
  findProjectHealth,
  getRegistryHealth,
} from '@/entities/linked-project/health';
import { presentProjectHealth } from '@/entities/linked-project/present-health';
import {
  listProjectRoutingLog,
  routingLogFilePath,
} from '@/entities/routing-log/api';
import { ProjectRoutingLog } from '@/entities/routing-log/ui/project-routing-log';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { LinkedProjectHeader } from '@/widgets/project-header';

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const project = getLinkedProjectBySlug(slug);
  if (!project) notFound();

  const health = findProjectHealth(getRegistryHealth(), project.path);
  const view = presentProjectHealth(health, project.pathExists);
  const routingEntries = listProjectRoutingLog(project.path, 90);
  const logPath = routingLogFilePath();

  return (
    <div className="space-y-5">
      <LinkedProjectHeader project={project} />

      <Card className="space-y-4 p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-sa-muted">
              Path
            </dt>
            <dd className="mt-1 break-all font-mono text-sm text-sa-ink">
              {project.path}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-sa-muted">
              Pasta
            </dt>
            <dd className="mt-1">
              <Badge>{project.pathExists ? 'existe' : 'ausente'}</Badge>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-sa-muted">
              Saúde do setup
            </dt>
            <dd className="mt-1 text-sm text-sa-ink">{view.statusLabel}</dd>
            {view.setupMessages.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-sa-secondary">
                {view.setupMessages.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-sa-muted">
                Symlinks, perfil e pasta ok — nada a corrigir no Shared AI.
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-sa-muted">
              Alterações locais (git)
            </dt>
            <dd className="mt-1 text-sm text-sa-ink">{view.dirtyLabel}</dd>
            <p className="mt-1 text-xs text-sa-muted">
              Contagem de arquivos modificados/não commitados. É normal no dia a
              dia e não indica problema no Shared AI.
            </p>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-sa-muted">
              Primeiro link
            </dt>
            <dd className="mt-1 text-sm text-sa-ink">
              {formatWhen(project.firstLinked)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-sa-muted">
              Último link
            </dt>
            <dd className="mt-1 text-sm text-sa-ink">
              {formatWhen(project.lastLinked)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-sa-muted">
              Perfil
            </dt>
            <dd className="mt-1 text-sm text-sa-ink">
              {project.profile ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-sa-muted">
              Git remote
            </dt>
            <dd className="mt-1 break-all font-mono text-sm text-sa-ink">
              {project.gitRemote ?? '—'}
            </dd>
          </div>
        </dl>

        <form action={unregisterLinkedProjectAction}>
          <input type="hidden" name="slug" value={project.slug} />
          <Button type="submit" variant="secondary" size="sm">
            Remover do registro
          </Button>
          <p className="mt-2 text-xs text-sa-muted">
            Só tira do{' '}
            <code className="text-sa-ink">projects.json</code>. Symlinks do
            Cursor saem com{' '}
            <code className="text-sa-ink">npm run detach -- {project.path}</code>
            .
          </p>
        </form>
      </Card>

      <Card className="p-5">
        <ProjectRoutingLog entries={routingEntries} logPath={logPath} />
      </Card>
    </div>
  );
}
