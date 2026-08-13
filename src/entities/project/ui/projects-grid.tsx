'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

import type { ProjectListItem } from '@/entities/project';
import { ProjectCard } from '@/entities/project/ui/project-card';
import { EmptyState } from '@/shared/ui/empty-state';

type GithubFilter = 'all' | 'with' | 'without';
type RunsFilter = 'all' | 'with' | 'without';
type SortKey = 'runs_desc' | 'runs_asc' | 'name_asc' | 'name_desc';

const selectClass =
  'h-10 rounded-hd-md border border-hd-border bg-hd-canvas px-2.5 text-sm text-hd-text-strong';

function matchesQuery(project: ProjectListItem, q: string) {
  if (!q) return true;
  const hay = [
    project.name,
    project.slug,
    project.github_owner,
    project.github_repo,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function filterAndSort(
  projects: ProjectListItem[],
  query: string,
  github: GithubFilter,
  runs: RunsFilter,
  sort: SortKey,
): ProjectListItem[] {
  const q = query.trim().toLowerCase();
  const list = projects.filter((project) => {
    if (!matchesQuery(project, q)) return false;
    const hasGithub = Boolean(project.github_owner && project.github_repo);
    if (github === 'with' && !hasGithub) return false;
    if (github === 'without' && hasGithub) return false;
    if (runs === 'with' && project.runs_count <= 0) return false;
    if (runs === 'without' && project.runs_count > 0) return false;
    return true;
  });

  list.sort((a, b) => {
    switch (sort) {
      case 'runs_asc':
        if (a.runs_count !== b.runs_count) return a.runs_count - b.runs_count;
        return a.name.localeCompare(b.name, 'pt-BR');
      case 'name_asc':
        return a.name.localeCompare(b.name, 'pt-BR');
      case 'name_desc':
        return b.name.localeCompare(a.name, 'pt-BR');
      case 'runs_desc':
      default:
        if (b.runs_count !== a.runs_count) return b.runs_count - a.runs_count;
        return a.name.localeCompare(b.name, 'pt-BR');
    }
  });

  return list;
}

export function ProjectsGrid({ projects }: { projects: ProjectListItem[] }) {
  const [query, setQuery] = useState('');
  const [github, setGithub] = useState<GithubFilter>('all');
  const [runs, setRuns] = useState<RunsFilter>('all');
  const [sort, setSort] = useState<SortKey>('runs_desc');

  const filtered = filterAndSort(projects, query, github, runs, sort);

  if (projects.length === 0) {
    return (
      <EmptyState
        title="Nenhum projeto ainda"
        description="Reivindique um projeto sem owner abaixo, ou peça um convite a um owner."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-hd-xl border border-hd-border bg-hd-canvas p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="relative min-w-0 flex-1 space-y-1 text-xs font-medium text-hd-muted">
          Buscar
          <span className="relative mt-1 block">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hd-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, slug ou repo…"
              className="h-10 w-full rounded-hd-md border border-hd-border bg-hd-canvas py-2 pl-9 pr-3 text-sm text-hd-text-strong outline-none focus:border-hd-primary/50 focus:ring-2 focus:ring-hd-primary/20"
            />
          </span>
        </label>

        <label className="space-y-1 text-xs font-medium text-hd-muted">
          GitHub
          <select
            className={`${selectClass} mt-1 block w-full sm:w-38`}
            value={github}
            onChange={(e) => setGithub(e.target.value as GithubFilter)}
          >
            <option value="all">todos</option>
            <option value="with">com repo</option>
            <option value="without">sem repo</option>
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-hd-muted">
          Reviews
          <select
            className={`${selectClass} mt-1 block w-full sm:w-38`}
            value={runs}
            onChange={(e) => setRuns(e.target.value as RunsFilter)}
          >
            <option value="all">todos</option>
            <option value="with">com reviews</option>
            <option value="without">sem reviews</option>
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-hd-muted">
          Ordenar
          <select
            className={`${selectClass} mt-1 block w-full sm:w-44`}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="runs_desc">mais reviews</option>
            <option value="runs_asc">menos reviews</option>
            <option value="name_asc">nome A–Z</option>
            <option value="name_desc">nome Z–A</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-hd-muted">
        {filtered.length} de {projects.length} projeto
        {projects.length === 1 ? '' : 's'}
        {sort === 'runs_desc' ? ' · ordenado por reviews' : null}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum projeto com esses filtros"
          description="Ajuste a busca ou limpe os filtros."
        />
      ) : (
        <ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <li key={project.id} className="h-full">
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
