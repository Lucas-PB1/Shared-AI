import Link from 'next/link';

import {
  listMemberProjects,
  listUnclaimedProjects,
} from '@/entities/project';
import { ClaimProjectButton } from '@/features/claim-project';
import { Badge } from '@/shared/ui/badge';
import { Card, CardDescription, CardTitle } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';

export default async function ProjectsPage() {
  const [projects, unclaimed] = await Promise.all([
    listMemberProjects(),
    listUnclaimedProjects(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Projetos</h1>
        <p className="mt-2 text-hd-muted">
          Projetos do review store aos quais você tem acesso via membership.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-hd-ink">Meus projetos</h2>
        {projects.length === 0 ? (
          <EmptyState
            title="Nenhum projeto ainda"
            description="Reivindique um projeto sem owner abaixo, ou peça um convite a um owner."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.slug}`} className="block no-underline">
                  <Card className="h-full transition-shadow hover:shadow-hd-accent">
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {project.slug}
                    </CardDescription>
                    {project.github_owner && project.github_repo ? (
                      <p className="mt-3 text-xs text-hd-muted">
                        {project.github_owner}/{project.github_repo}
                      </p>
                    ) : null}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-hd-ink">Sem owner</h2>
          <Badge>claim</Badge>
        </div>
        <p className="text-sm text-hd-muted">
          Projetos seedados sem membros — o primeiro a reivindicar vira owner.
        </p>
        {unclaimed.length === 0 ? (
          <EmptyState title="Nada para reivindicar" description="Todos os projetos já têm membros." />
        ) : (
          <ul className="space-y-3">
            {unclaimed.map((project) => (
              <li
                key={project.id}
                className="flex flex-col gap-3 rounded-hd-xl border border-hd-border bg-hd-canvas p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-hd-ink">{project.name}</p>
                  <p className="font-mono text-xs text-hd-muted">{project.slug}</p>
                </div>
                <ClaimProjectButton
                  projectId={project.id}
                  projectName={project.name}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
