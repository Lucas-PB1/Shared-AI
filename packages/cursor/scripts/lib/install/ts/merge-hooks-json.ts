#!/usr/bin/env node
/** Injeta sessionStart do shared-ai em hooks.json sem remover outros hooks. */
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

const SESSION_MATCH: HookCmdMatcher = {
  markers: ['ensure-project-cursor', 'ensure-project-rules'],
  unixCommand: './hooks/ensure-project-cursor.sh',
  unixScriptHints: ['ensure-project-cursor'],
};

const ROUTING_STOP_MATCH: HookCmdMatcher = {
  markers: ['routing-log-stop'],
  unixCommand: './hooks/routing-log-stop.sh',
  unixScriptHints: ['routing-log-stop'],
};

export function mergeHooks(hooksPath: string, examplePath: string | null): string {
  const { data, action: initial } = loadHooksJsonDocument(hooksPath, examplePath);
  let action: string = initial;

  const hooksObj = getHooksObject(data);
  const session = getHookEventList(hooksObj, 'sessionStart');
  const stop = getHookEventList(hooksObj, 'stop');

  if (stripWrongOsHookEntries(session, SESSION_MATCH)) {
    action = bumpAction(action);
  }
  if (stripWrongOsHookEntries(stop, ROUTING_STOP_MATCH)) {
    action = bumpAction(action);
  }

  if (!hasMatchingHookEntry(session, SESSION_MATCH)) {
    session.push({
      command: platformHookCommand(
        './hooks/ensure-project-cursor.sh',
        './hooks/ensure-project-cursor.ps1',
      ),
    });
    action = bumpAction(action);
  }

  if (!hasMatchingHookEntry(stop, ROUTING_STOP_MATCH)) {
    stop.push({
      command: platformHookCommand(
        './hooks/routing-log-stop.sh',
        './hooks/routing-log-stop.ps1',
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
