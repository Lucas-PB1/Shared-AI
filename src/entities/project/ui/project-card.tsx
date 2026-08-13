import { ArrowUpRight, FolderGit2 } from 'lucide-react';
import Link from 'next/link';

import type { Project } from '@/entities/project';
import { cn } from '@/shared/lib/cn';

function githubLabel(project: Project) {
  if (project.github_owner && project.github_repo) {
    return `${project.github_owner}/${project.github_repo}`;
  }
  return 'Sem repositório GitHub';
}

function projectInitial(name: string) {
  return (name.trim()[0] ?? 'P').toUpperCase();
}

export function ProjectCard({ project }: { project: Project }) {
  const repo = githubLabel(project);
  const hasRepo = Boolean(project.github_owner && project.github_repo);

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block h-full no-underline"
    >
      <article
        className={cn(
          'relative flex h-full min-h-38 flex-col overflow-hidden rounded-hd-2xl border border-hd-border bg-hd-canvas p-5 shadow-hd-md',
          'transition-[transform,box-shadow,border-color] duration-200',
          'hover:-translate-y-0.5 hover:border-hd-primary/35 hover:shadow-hd-accent',
        )}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-hd-primary opacity-80 transition-all group-hover:w-1.5"
        />
        <div className="flex items-start justify-between gap-3 pl-2">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hd-xl bg-hd-primary-soft font-display text-lg font-semibold text-hd-primary-strong">
              {projectInitial(project.name)}
            </span>
            <div className="min-w-0">
              <h2 className="line-clamp-1 font-display text-lg font-semibold leading-snug text-hd-ink">
                {project.name}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-hd-muted">{project.slug}</p>
            </div>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hd-surface text-hd-secondary transition-colors group-hover:bg-hd-primary group-hover:text-white">
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </span>
        </div>

        <p
          className={cn(
            'mt-auto flex items-center gap-2 pl-2 pt-5 text-xs',
            hasRepo ? 'text-hd-secondary' : 'text-hd-muted',
          )}
          title={repo}
        >
          <FolderGit2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="line-clamp-1 font-mono">{repo}</span>
        </p>
      </article>
    </Link>
  );
}
