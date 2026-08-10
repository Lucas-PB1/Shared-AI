#!/usr/bin/env node
/** Merge hook stop do /historico em hooks.json do projeto (idempotente). */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  atomicWriteJson,
  getHookEventList,
  getHooksObject,
  loadHooksJsonDocument,
} from './json-io.js';
import {
  bumpAction,
  hasMatchingHookEntry,
  platformHookCommand,
  removeMarkedHookEntries,
  stripWrongOsHookEntries,
  type HookCmdMatcher,
} from './hooks-platform.js';
import { runCliMain } from './cli-entry.js';

const MATCH: HookCmdMatcher = {
  markers: ['historico-stop', 'history-watch-match'],
  unixCommand: '.cursor/hooks/historico-stop.sh',
  unixScriptHints: ['historico-stop.sh'],
};

function hasEnabledWatches(projectRoot: string): boolean {
  const watchesPath = resolve(projectRoot, '.cursor/history/watches.json');
  if (!existsSync(watchesPath)) return false;
  try {
    const data = JSON.parse(readFileSync(watchesPath, 'utf-8')) as {
      watches?: Array<{ enabled?: boolean }>;
    };
    for (const watch of data.watches ?? []) {
      if (typeof watch === 'object' && watch !== null && watch.enabled !== false) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

export function mergeHistoricoHooks(hooksPath: string, projectRoot: string | null = null): string {
  const root = projectRoot ?? resolve(hooksPath, '..', '..');
  const enabled = hasEnabledWatches(root);

  const { data, action: initial } = loadHooksJsonDocument(hooksPath, null);
  let action: string = initial;

  const hooksObj = getHooksObject(data);
  const stop = getHookEventList(hooksObj, 'stop');

  if (stripWrongOsHookEntries(stop, MATCH)) {
    action = bumpAction(action);
  }

  if (!enabled) {
    if (removeMarkedHookEntries(stop, MATCH.markers)) {
      action = bumpAction(action);
    }
  } else if (!hasMatchingHookEntry(stop, MATCH)) {
    stop.push({
      command: platformHookCommand(
        '.cursor/hooks/historico-stop.sh',
        '.cursor/hooks/historico-stop.ps1',
      ),
      loop_limit: 1,
    });
    action = bumpAction(action);
  }

  atomicWriteJson(hooksPath, data);
  return action;
}

function main(): number {
  if (process.argv.length < 3) {
    process.stderr.write('Uso: merge-historico-hooks.ts <hooks.json> [project_root]\n');
    return 1;
  }

  const hooksPath = process.argv[2]!;
  const projectRoot = process.argv.length > 3 ? resolve(process.argv[3]!) : null;

  try {
    process.stdout.write(mergeHistoricoHooks(hooksPath, projectRoot));
  } catch (err) {
    process.stderr.write(`Erro: ${String(err)}\n`);
    return 1;
  }
  return 0;
}

runCliMain(import.meta.url, main);
