#!/usr/bin/env node
/** Detecta perfil de bootstrap a partir de manifestos na raiz do projeto. */
import { readFileSync, statSync } from 'node:fs';
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

export function detectProfile(rootInput: string): string {
  const root = resolve(rootInput);

  const composer = readJson(resolve(root, 'composer.json'));
  if (composer) {
    const require = {
      ...((composer.require as Record<string, string> | undefined) ?? {}),
      ...((composer['require-dev'] as Record<string, string> | undefined) ?? {}),
    };
    if ('laravel/framework' in require) return 'laravel';
    for (const pkg of Object.keys(require)) {
      if (pkg.startsWith('laminas/') || pkg.startsWith('zendframework/')) {
        return 'zend-laminas';
      }
    }
  }

  const pkg = resolve(root, 'package.json');
  try {
    statSync(pkg);
    const deps = packageDeps(pkg);
    if ('next' in deps) return 'next';
    if ('react' in deps || 'react-dom' in deps) return 'react';
  } catch {
    // no package.json
  }

  for (const marker of ['pyproject.toml', 'requirements.txt', 'setup.py'] as const) {
    try {
      statSync(resolve(root, marker));
      return 'python';
    } catch {
      // continue
    }
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
