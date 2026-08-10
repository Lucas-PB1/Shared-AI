#!/usr/bin/env node
/** Registro de projetos ligados ao hostdime-ia (projects.json). */
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

interface ProjectEntry {
  path: string;
  firstLinked: string;
  lastLinked: string;
}

interface RegistryData {
  projects: ProjectEntry[];
}

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

function defaultRegistryPath(): string {
  return join(homedir(), '.cursor', 'hostdime-ia', 'projects.json');
}

function resolveRegistry(arg?: string): string {
  return arg ?? process.env.HOSTDIME_REGISTRY_FILE ?? defaultRegistryPath();
}

function ensureRegistry(registry: string): void {
  mkdirSync(dirname(registry), { recursive: true });
  if (!existsSync(registry)) {
    writeFileSync(registry, '{"projects":[]}\n', 'utf-8');
  }
}

function load(registry: string): RegistryData {
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

  const data = load(registry);
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
  const data = load(registry);
  for (const p of data.projects) {
    if (p.path) process.stdout.write(`${p.path}\n`);
  }
  return 0;
}

function cmdUnregister(pathArg: string, registry: string): number {
  const path = real(pathArg);
  const data = load(registry);
  const before = data.projects.length;
  data.projects = data.projects.filter((p) => real(p.path) !== path);
  save(registry, data);
  return before > data.projects.length ? 0 : 1;
}

function cmdPrune(registry: string): number {
  const data = load(registry);
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
