import { notFound } from 'next/navigation';

import {
  getLinkedProjectBySlug,
  unregisterLinkedProjectAction,
} from '@/entities/linked-project';
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
    </div>
  );
}
