import Link from 'next/link';

import type { Project } from '@/entities/project';
import { Badge } from '@/shared/ui/badge';

export function ProjectHeader({
  project,
  role,
  stats,
}: {
  project: Project;
  role?: string | null;
  stats?: { runs: number; members: number; accepted: number; exclusions: number };
}) {
  const repo =
    project.github_owner && project.github_repo
      ? `${project.github_owner}/${project.github_repo}`
      : null;
  const repoUrl = repo ? `https://github.com/${repo}` : null;

  return (
    <header className="overflow-hidden rounded-hd-2xl border border-hd-border bg-hd-canvas shadow-hd-md">
      <div className="h-1 bg-linear-to-r from-hd-primary via-hd-primary-alt to-hd-secondary" />
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="min-w-0">
          <p className="text-xs text-hd-muted">
            <Link href="/" className="font-medium no-underline hover:text-hd-primary">
              Projetos
            </Link>
            <span className="mx-1.5 text-hd-border">/</span>
            <span className="font-mono text-hd-text-strong">{project.slug}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
              {project.name}
            </h1>
            {role ? <Badge>{role}</Badge> : null}
          </div>
          {repoUrl ? (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex font-mono text-xs text-hd-primary no-underline hover:underline"
            >
              {repo} ↗
            </a>
          ) : null}
        </div>
        {stats ? (
          <dl className="grid grid-cols-4 gap-2 sm:min-w-[16rem]">
            {[
              ['Runs', stats.runs],
              ['Aceitos', stats.accepted],
              ['Excl.', stats.exclusions],
              ['Time', stats.members],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="rounded-hd-md border border-hd-border/80 bg-hd-surface/50 px-2 py-1.5 text-center"
              >
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-hd-muted">
                  {label}
                </dt>
                <dd className="text-sm font-semibold text-hd-ink">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </header>
  );
}
