#!/usr/bin/env node
/** Merge hostdime auto config into ~/.cursor/cli-config.json. */
import { existsSync, readFileSync } from 'node:fs';
import { atomicWriteJson, readJsonObject } from '../shared/json-io.js';
import { runCliMain } from '../shared/cli-entry.js';

function mergeConfig(
  existing: Record<string, unknown>,
  template: Record<string, unknown>,
): [Record<string, unknown>, boolean] {
  const merged = { ...existing };
  let mutated = false;

  for (const [key, value] of Object.entries(template)) {
    if (key === 'permissions') {
      const perms = { ...((merged.permissions as Record<string, unknown> | undefined) ?? {}) };
      const tplPerms = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
      const deny = [...((perms.deny as unknown[] | undefined) ?? [])];
      const tplDeny = (tplPerms.deny as unknown[] | undefined) ?? [];
      for (const item of tplDeny) {
        if (!deny.includes(item)) {
          deny.push(item);
          mutated = true;
        }
      }
      perms.deny = deny;
      if (!('allow' in perms)) {
        perms.allow = tplPerms.allow ?? [];
        mutated = true;
      }
      merged.permissions = perms;
      continue;
    }

    if (!(key in merged)) {
      merged[key] = value;
      mutated = true;
      continue;
    }

    if (key === 'approvalMode' && merged[key] !== value) {
      merged[key] = value;
      mutated = true;
    }
  }

  if (merged.version !== template.version) {
    merged.version = template.version ?? 1;
    mutated = true;
  }

  if (!('editor' in merged)) {
    merged.editor = template.editor ?? { vimMode: false };
    mutated = true;
  }

  return [merged, mutated];
}

export function applyAutoConfig(configPath: string, templatePath: string): string {
  const template = JSON.parse(readFileSync(templatePath, 'utf-8')) as Record<string, unknown>;

  let merged: Record<string, unknown>;
  let action: string;

  if (existsSync(configPath)) {
    const existing = readJsonObject(configPath);
    const [result, mutated] = mergeConfig(existing, template);
    merged = result;
    action = mutated ? 'merged' : 'ok';
  } else {
    merged = template;
    action = 'created';
  }

  atomicWriteJson(configPath, merged);
  return action;
}

function main(): number {
  if (process.argv.length < 4) {
    process.stderr.write('Uso: merge-cursor-cli-config.ts <cli-config.json> <template.json>\n');
    return 1;
  }

  const configPath = process.argv[2]!;
  const templatePath = process.argv[3]!;

  try {
    process.stdout.write(applyAutoConfig(configPath, templatePath));
  } catch (err) {
    process.stderr.write(`Erro: ${String(err)}\n`);
    return 1;
  }
  return 0;
}

runCliMain(import.meta.url, main);
