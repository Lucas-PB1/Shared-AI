import { ArrowUpRight, FolderGit2, FolderX } from 'lucide-react';
import Link from 'next/link';

import type { LinkedProject, ProjectReport } from '@/entities/linked-project';
import { cn } from '@/shared/lib/cn';

function projectInitial(name: string) {
  return (name.trim()[0] ?? 'P').toUpperCase();
}

function healthLabel(report: ProjectReport | undefined, pathExists: boolean) {
  if (!pathExists) return { text: 'ausente', tone: 'warn' as const };
  if (!report) return { text: '—', tone: 'muted' as const };
  if (report.ok) return { text: 'ok', tone: 'ok' as const };
  return { text: `${report.issues.length} aviso(s)`, tone: 'warn' as const };
}

export function LinkedProjectCard({
  project,
  health,
}: {
  project: LinkedProject;
  health?: ProjectReport;
}) {
  const status = healthLabel(health, project.pathExists);

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block h-full no-underline"
    >
      <article
        className={cn(
          'relative flex h-full min-h-38 flex-col overflow-hidden rounded-sa-2xl border border-sa-border bg-sa-canvas p-5 shadow-sa-md',
          'transition-[transform,box-shadow,border-color] duration-200',
          'hover:-translate-y-0.5 hover:border-sa-primary/35 hover:shadow-sa-accent',
        )}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-sa-primary opacity-80 transition-all group-hover:w-1.5"
        />
        <div className="flex items-start justify-between gap-3 pl-2">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sa-xl bg-sa-primary-soft font-display text-lg font-semibold text-sa-primary-strong">
              {projectInitial(project.name)}
            </span>
            <div className="min-w-0">
              <h2 className="line-clamp-1 font-display text-lg font-semibold leading-snug text-sa-ink">
                {project.name}
              </h2>
              {project.profile ? (
                <p className="mt-0.5 font-mono text-xs text-sa-muted">
                  {project.profile}
                </p>
              ) : null}
            </div>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sa-surface text-sa-secondary transition-colors group-hover:bg-sa-primary group-hover:text-white">
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </span>
        </div>

        <p
          className={cn(
            'mt-3 pl-2 text-[10px] font-semibold uppercase tracking-wide',
            status.tone === 'ok' && 'text-sa-primary',
            status.tone === 'warn' && 'text-amber-700',
            status.tone === 'muted' && 'text-sa-muted',
          )}
        >
          Saúde: {status.text}
        </p>

        <p
          className={cn(
            'mt-auto flex items-center gap-2 pl-2 pt-3 text-xs',
            project.pathExists ? 'text-sa-secondary' : 'text-sa-muted',
          )}
          title={project.path}
        >
          {project.pathExists ? (
            <FolderGit2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          ) : (
            <FolderX className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          )}
          <span className="line-clamp-1 font-mono">{project.path}</span>
        </p>
      </article>
    </Link>
  );
}
