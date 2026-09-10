'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

import type { LinkedProject } from '@/entities/linked-project';
import { LinkedProjectCard } from '@/entities/linked-project/ui/project-card';
import { EmptyState } from '@/shared/ui/empty-state';

const selectClass =
  'h-10 rounded-sa-md border border-sa-border bg-sa-canvas px-2.5 text-sm text-sa-text-strong';

type PathFilter = 'all' | 'ok' | 'missing';
type SortKey = 'recent' | 'name';

export function LinkedProjectsGrid({
  projects,
}: {
  projects: LinkedProject[];
}) {
  const [query, setQuery] = useState('');
  const [pathFilter, setPathFilter] = useState<PathFilter>('all');
  const [sort, setSort] = useState<SortKey>('recent');

  const q = query.trim().toLowerCase();
  const filtered = projects
    .filter((project) => {
      if (pathFilter === 'ok' && !project.pathExists) return false;
      if (pathFilter === 'missing' && project.pathExists) return false;
      if (!q) return true;
      const hay = [project.name, project.path, project.profile, project.gitRemote]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'pt-BR');
      return b.lastLinked.localeCompare(a.lastLinked);
    });

  if (projects.length === 0) {
    return (
      <EmptyState
        title="Nenhum repositório ligado"
        description="Use npm run bootstrap -- caminho/do/repo para registrar um projeto neste computador."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-sa-xl border border-sa-border bg-sa-canvas p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="relative min-w-0 flex-1 space-y-1 text-xs font-medium text-sa-muted">
          Buscar
          <span className="relative mt-1 block">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sa-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, path ou remote…"
              className="h-10 w-full rounded-sa-md border border-sa-border bg-sa-canvas py-2 pl-9 pr-3 text-sm text-sa-text-strong outline-none focus:border-sa-primary/50 focus:ring-2 focus:ring-sa-primary/20"
            />
          </span>
        </label>
        <label className="space-y-1 text-xs font-medium text-sa-muted">
          Pasta
          <select
            className={`${selectClass} mt-1 block w-full sm:w-38`}
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value as PathFilter)}
          >
            <option value="all">todas</option>
            <option value="ok">existem</option>
            <option value="missing">ausentes</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-sa-muted">
          Ordenar
          <select
            className={`${selectClass} mt-1 block w-full sm:w-44`}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="recent">ligado recentemente</option>
            <option value="name">nome A–Z</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-sa-muted">
        {filtered.length} de {projects.length} projeto
        {projects.length === 1 ? '' : 's'}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum projeto com esses filtros"
          description="Ajuste a busca ou limpe os filtros."
        />
      ) : (
        <ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <li key={project.slug} className="h-full">
              <LinkedProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
