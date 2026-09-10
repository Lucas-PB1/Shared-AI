#!/usr/bin/env node
/** Registro de projetos ligados ao shared-ai (projects.json). */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

export type ProjectEntry = {
  path: string;
  firstLinked: string;
  lastLinked: string;
};

export type RegistryData = {
  projects: ProjectEntry[];
};

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function real(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

function isEphemeral(path: string): boolean {
  if (!path) return true;
  const p = real(path);
  if (p === '/tmp' || p === '/var/tmp') return true;
  return p.startsWith('/tmp/') || p.startsWith('/var/tmp/');
}

function isUserCursorRoot(path: string): boolean {
  const home = real(homedir());
  const cursor = real(join(home, '.cursor'));
  const p = real(path);
  return p === home || p === cursor;
}

export function defaultRegistryPath(): string {
  return join(homedir(), '.cursor', 'shared-ai', 'projects.json');
}

export function resolveRegistry(arg?: string): string {
  return arg ?? process.env.SHARED_AI_REGISTRY_FILE ?? defaultRegistryPath();
}

function ensureRegistry(registry: string): void {
  mkdirSync(dirname(registry), { recursive: true });
  if (!existsSync(registry)) {
    writeFileSync(registry, '{"projects":[]}\n', 'utf-8');
  }
}

export function loadRegistry(registry: string): RegistryData {
  ensureRegistry(registry);
  try {
    const data = JSON.parse(readFileSync(registry, 'utf-8')) as RegistryData;
    if (!Array.isArray(data.projects)) data.projects = [];
    return data;
  } catch {
    return { projects: [] };
  }
}

function save(registry: string, data: RegistryData): void {
  ensureRegistry(registry);
  writeFileSync(registry, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function cmdRegister(pathArg: string, registry: string): number {
  const path = real(pathArg);
  const defaultReg = real(defaultRegistryPath());
  if (isEphemeral(path) && real(registry) === defaultReg) return 0;
  if (isUserCursorRoot(path)) return 0;

  const data = loadRegistry(registry);
  const now = nowIso();
  let found = false;
  for (const p of data.projects) {
    if (real(p.path) === path) {
      p.lastLinked = now;
      found = true;
      break;
    }
  }
  if (!found) {
    data.projects.push({ path, firstLinked: now, lastLinked: now });
  }
  save(registry, data);
  return 0;
}

function cmdList(registry: string): number {
  const data = loadRegistry(registry);
  for (const p of data.projects) {
    if (p.path) process.stdout.write(`${p.path}\n`);
  }
  return 0;
}

export function unregisterProject(pathArg: string, registry?: string): boolean {
  const file = registry ?? resolveRegistry();
  const path = real(pathArg);
  const data = loadRegistry(file);
  const before = data.projects.length;
  data.projects = data.projects.filter((p) => real(p.path) !== path);
  save(file, data);
  return before > data.projects.length;
}

function cmdUnregister(pathArg: string, registry: string): number {
  return unregisterProject(pathArg, registry) ? 0 : 1;
}

export function pruneRegistry(registry?: string): void {
  const file = registry ?? resolveRegistry();
  cmdPrune(file);
}

function cmdPrune(registry: string): number {
  const data = loadRegistry(registry);
  data.projects = data.projects.filter((p) => {
    const path = p.path;
    if (!path) return false;
    try {
      if (!statSync(path).isDirectory()) return false;
    } catch {
      return false;
    }
    if (isEphemeral(path) || isUserCursorRoot(path)) return false;
    return true;
  });
  save(registry, data);
  return 0;
}

function usage(): void {
  process.stderr.write(
    'Uso: projects-registry.ts register|list|unregister|prune [path] [registry]\n',
  );
}

function main(): number {
  const [cmd, a, b] = process.argv.slice(2);
  if (!cmd) {
    usage();
    return 2;
  }
  switch (cmd) {
    case 'register': {
      if (!a) {
        usage();
        return 2;
      }
      return cmdRegister(a, resolveRegistry(b));
    }
    case 'list':
      return cmdList(resolveRegistry(a));
    case 'unregister': {
      if (!a) {
        usage();
        return 2;
      }
      return cmdUnregister(a, resolveRegistry(b));
    }
    case 'prune':
      return cmdPrune(resolveRegistry(a));
    default:
      usage();
      return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}
