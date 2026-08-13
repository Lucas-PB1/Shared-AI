import Link from 'next/link';

import type { Project } from '@/entities/project';
import { Badge } from '@/shared/ui/badge';

export function ProjectHeader({
  project,
  role,
}: {
  project: Project;
  role?: string | null;
}) {
  const repo =
    project.github_owner && project.github_repo
      ? `${project.github_owner}/${project.github_repo}`
      : null;

  return (
    <div className="mb-8 overflow-hidden rounded-hd-2xl border border-hd-border bg-hd-canvas shadow-hd-md">
      <div className="h-1.5 bg-linear-to-r from-hd-primary via-hd-primary-alt to-hd-secondary" />
      <div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-end sm:justify-between md:px-7">
        <div>
          <p className="text-sm text-hd-muted">
            <Link href="/" className="font-medium no-underline">
              Projetos
            </Link>
            <span className="mx-2 text-hd-border">/</span>
            <span className="font-mono text-hd-text-strong">{project.slug}</span>
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {project.name}
          </h1>
          {repo ? (
            <p className="mt-2 font-mono text-sm text-hd-muted">{repo}</p>
          ) : null}
        </div>
        {role ? <Badge className="self-start sm:self-auto">{role}</Badge> : null}
      </div>
    </div>
  );
}
