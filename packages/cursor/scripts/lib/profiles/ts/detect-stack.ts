#!/usr/bin/env node
/** Detecta perfil de bootstrap a partir de manifestos na raiz do projeto. */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function packageDeps(pkgPath: string): Record<string, string> {
  const data = readJson(pkgPath);
  if (!data) return {};
  const deps: Record<string, string> = {};
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
    Object.assign(deps, (data[key] as Record<string, string> | undefined) ?? {});
  }
  return deps;
}

function isMonorepoRoot(root: string, pkgData: Record<string, unknown> | null): boolean {
  if (existsSync(resolve(root, 'pnpm-workspace.yaml'))) return true;
  if (existsSync(resolve(root, 'turbo.json'))) return true;
  if (existsSync(resolve(root, 'nx.json'))) return true;
  if (!pkgData) return false;
  const workspaces = pkgData.workspaces;
  if (Array.isArray(workspaces) && workspaces.length > 0) return true;
  if (
    workspaces &&
    typeof workspaces === 'object' &&
    Array.isArray((workspaces as { packages?: unknown }).packages) &&
    ((workspaces as { packages: unknown[] }).packages?.length ?? 0) > 0
  ) {
    return true;
  }
  return false;
}

export function detectProfile(rootInput: string): string {
  const root = resolve(rootInput);
  const pkgPath = resolve(root, 'package.json');
  let pkgData: Record<string, unknown> | null = null;

  try {
    statSync(pkgPath);
    pkgData = readJson(pkgPath);
  } catch {
    // no package.json — still check pnpm-workspace etc.
  }

  if (isMonorepoRoot(root, pkgData)) return 'monorepo';

  if (pkgData) {
    const deps = packageDeps(pkgPath);
    if ('@nestjs/core' in deps || '@nestjs/common' in deps) return 'nestjs';
    if ('next' in deps) return 'next';
    if ('react' in deps || 'react-dom' in deps) return 'react';
  }

  return '';
}

function main(): number {
  if (process.argv.length !== 3) {
    process.stderr.write('Uso: detect-stack.ts /caminho/do/projeto\n');
    return 2;
  }
  const path = process.argv[2]!;
  try {
    if (!statSync(path).isDirectory()) {
      process.stdout.write('');
      return 1;
    }
  } catch {
    process.stdout.write('');
    return 1;
  }
  process.stdout.write(detectProfile(path));
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}
