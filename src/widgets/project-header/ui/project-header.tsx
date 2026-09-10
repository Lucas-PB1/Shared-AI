import Link from 'next/link';

import type { LinkedProject } from '@/entities/linked-project';
import { Badge } from '@/shared/ui/badge';

export function LinkedProjectHeader({ project }: { project: LinkedProject }) {
  return (
    <header className="overflow-hidden rounded-sa-2xl border border-sa-border bg-sa-canvas shadow-sa-md">
      <div className="h-1 bg-linear-to-r from-sa-primary via-sa-primary-alt to-sa-secondary" />
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="min-w-0">
          <p className="text-xs text-sa-muted">
            <Link href="/projects" className="font-medium no-underline hover:text-sa-primary">
              Projetos
            </Link>
            <span className="mx-1.5 text-sa-border">/</span>
            <span className="font-mono text-sa-text-strong">{project.slug}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
              {project.name}
            </h1>
            <Badge>{project.pathExists ? 'local' : 'ausente'}</Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
