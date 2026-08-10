#!/usr/bin/env node
/** Injeta sessionStart do hostdime-ia em hooks.json sem remover outros hooks. */
import {
  atomicWriteJson,
  getHookEventList,
  getHooksObject,
  loadHooksJsonDocument,
} from '../../shared/json-io.js';
import {
  bumpAction,
  hasMatchingHookEntry,
  platformHookCommand,
  stripWrongOsHookEntries,
  type HookCmdMatcher,
} from '../../shared/hooks-platform.js';
import { runCliMain } from '../../shared/cli-entry.js';

const MATCH: HookCmdMatcher = {
  markers: ['ensure-project-cursor', 'ensure-project-rules'],
  unixCommand: './hooks/ensure-project-cursor.sh',
  unixScriptHints: ['ensure-project-cursor'],
};

export function mergeHooks(hooksPath: string, examplePath: string | null): string {
  const { data, action: initial } = loadHooksJsonDocument(hooksPath, examplePath);
  let action: string = initial;

  const hooksObj = getHooksObject(data);
  const session = getHookEventList(hooksObj, 'sessionStart');

  if (stripWrongOsHookEntries(session, MATCH)) {
    action = bumpAction(action);
  }

  if (!hasMatchingHookEntry(session, MATCH)) {
    session.push({
      command: platformHookCommand(
        './hooks/ensure-project-cursor.sh',
        './hooks/ensure-project-cursor.ps1',
      ),
    });
    action = bumpAction(action);
  }

  atomicWriteJson(hooksPath, data);
  return action;
}

function main(): number {
  if (process.argv.length < 3) {
    process.stderr.write('Uso: merge-hooks-json.ts <hooks.json> [hooks.json.example]\n');
    return 1;
  }

  const hooksPath = process.argv[2]!;
  const examplePath = process.argv.length > 3 ? process.argv[3]! : null;

  try {
    process.stdout.write(mergeHooks(hooksPath, examplePath));
  } catch (err) {
    process.stderr.write(`Erro: ${String(err)}\n`);
    return 1;
  }
  return 0;
}

runCliMain(import.meta.url, main);
