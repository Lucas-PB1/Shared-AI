import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  defaultRegistryPath,
  loadRegistry,
  unregisterProject,
} from '../../../packages/cursor/scripts/lib/install/ts/projects-registry';

import { slugFromPath } from './slug';
import type { LinkedProject, LinkedProjectSummary } from './types';

function displayName(projectPath: string): string {
  return basename(projectPath) || projectPath;
}

function readGitRemote(projectPath: string): string | null {
  const result = spawnSync(
    'git',
    ['-C', projectPath, 'remote', 'get-url', 'origin'],
    { encoding: 'utf8', windowsHide: true },
  );
  if (result.status !== 0) return null;
  const url = String(result.stdout ?? '').trim();
  return url || null;
}

function readProjectProfile(projectPath: string): string | null {
  const rulesDir = join(projectPath, '.cursor', 'rules');
  try {
    if (!existsSync(rulesDir) || !statSync(rulesDir).isDirectory()) {
      return existsSync(join(projectPath, '.cursor', 'SKILLS-ROUTING.md'))
        ? 'custom'
        : null;
    }
    for (const name of readdirSync(rulesDir)) {
      if (name.endsWith('-project.mdc')) {
        return name.replace(/-project\.mdc$/, '');
      }
    }
  } catch {
    return null;
  }
  return existsSync(join(projectPath, '.cursor', 'SKILLS-ROUTING.md'))
    ? 'custom'
    : null;
}

function toLinkedProject(entry: {
  path: string;
  firstLinked: string;
  lastLinked: string;
}): LinkedProject {
  const pathExists =
    Boolean(entry.path) &&
    existsSync(entry.path) &&
    statSync(entry.path).isDirectory();
  return {
    slug: slugFromPath(entry.path),
    name: displayName(entry.path),
    path: entry.path,
    firstLinked: entry.firstLinked,
    lastLinked: entry.lastLinked,
    pathExists,
    gitRemote: pathExists ? readGitRemote(entry.path) : null,
    profile: pathExists ? readProjectProfile(entry.path) : null,
  };
}

export function listLinkedProjects(): LinkedProject[] {
  const data = loadRegistry(defaultRegistryPath());
  return data.projects
    .filter((p) => p.path)
    .map(toLinkedProject)
    .sort((a, b) => b.lastLinked.localeCompare(a.lastLinked));
}

export function getLinkedProjectBySlug(slug: string): LinkedProject | null {
  return listLinkedProjects().find((p) => p.slug === slug) ?? null;
}

export function summarizeLinkedProjects(
  projects: LinkedProject[],
): LinkedProjectSummary {
  const missing = projects.filter((p) => !p.pathExists).length;
  const lastLinked =
    projects.reduce<string | null>((latest, p) => {
      if (!latest || p.lastLinked > latest) return p.lastLinked;
      return latest;
    }, null);
  return { total: projects.length, missing, lastLinked };
}

export function unregisterLinkedProject(projectPath: string): boolean {
  return unregisterProject(projectPath);
}
