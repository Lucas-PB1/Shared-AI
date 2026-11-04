#!/usr/bin/env node
/**
 * Wrapper estável do routing log, instalado em ~/.cursor/shared-ai-routing-log.mjs.
 *
 * O agente roda de dentro do projeto do usuário (não do clone shared-ai), então
 * não pode usar caminho relativo. Este wrapper resolve SHARED_AI_ROOT (env ou
 * ~/.cursor/shared-ai.env) e repassa os argumentos para append-routing-log.ts.
 *
 * Uso (bash e PowerShell):
 *   node "$HOME/.cursor/shared-ai-routing-log.mjs" append --source=agent --skills=a,b --ask="..." --project="..."
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const LOG_SCRIPT = 'packages/cursor/scripts/lib/routing/append-routing-log.ts';
const TSX_CLI = 'node_modules/tsx/dist/cli.mjs';

/** Lê um valor de shared-ai.env (bash grava com `printf %q`, PowerShell grava cru). */
export function parseEnvValue(raw) {
  let value = raw.trim();
  if (
    value.length >= 2 &&
    (value[0] === '"' || value[0] === "'") &&
    value.at(-1) === value[0]
  ) {
    return value.slice(1, -1);
  }
  // `printf %q` escapa espaços e afins com barra: /home/a\ b → /home/a b.
  // Só desfaz em caminhos POSIX: no Windows a barra é separador de diretório.
  if (value.startsWith('/')) {
    value = value.replace(/\\(.)/g, '$1');
  }
  return value;
}

export function readRootFromEnvFile(envFile) {
  if (!existsSync(envFile)) return null;
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = /^﻿?SHARED_AI_ROOT=(.*)$/.exec(line);
    if (match) return parseEnvValue(match[1]) || null;
  }
  return null;
}

function resolveRoot() {
  const fromEnv = process.env.SHARED_AI_ROOT;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const cursorDir = process.env.CURSOR_USER_DIR ?? join(homedir(), '.cursor');
  const fromFile = readRootFromEnvFile(join(cursorDir, 'shared-ai.env'));
  if (fromFile && existsSync(fromFile)) return fromFile;
  return null;
}

function main() {
  const root = resolveRoot();
  if (!root) {
    console.error(
      'Shared AI: SHARED_AI_ROOT não encontrado. Rode npm run setup:skills no clone shared-ai.',
    );
    return 1;
  }
  const script = join(root, LOG_SCRIPT);
  const tsx = join(root, TSX_CLI);
  if (!existsSync(script) || !existsSync(tsx)) {
    console.error(`Shared AI: ${LOG_SCRIPT} ou tsx ausente em ${root}. Rode npm install no clone.`);
    return 1;
  }
  const result = spawnSync(process.execPath, [tsx, script, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, SHARED_AI_ROOT: root },
    windowsHide: true,
  });
  return result.status ?? 1;
}

const invokedDirectly = /routing-log\.mjs$/.test(process.argv[1] ?? '');
if (invokedDirectly) {
  process.exit(main());
}
