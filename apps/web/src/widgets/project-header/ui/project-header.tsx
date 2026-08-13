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
    <div className="mb-8 flex flex-col gap-3 border-b border-hd-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-hd-muted">
          <Link href="/" className="no-underline">
            Projetos
          </Link>
          <span className="mx-2">/</span>
          <span className="text-hd-text-strong">{project.slug}</span>
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{project.name}</h1>
        {repo ? <p className="mt-1 text-sm text-hd-muted">{repo}</p> : null}
      </div>
      {role ? <Badge>{role}</Badge> : null}
    </div>
  );
}
