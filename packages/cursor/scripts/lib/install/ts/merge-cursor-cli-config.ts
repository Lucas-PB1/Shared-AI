#!/usr/bin/env node
/**
 * Merge da config shared-ai em ~/.cursor/cli-config.json.
 *
 * Padrão seguro: `approvalMode` do template (allowlist) só é aplicado quando o
 * usuário ainda não escolheu um modo — nunca sobrescreve a escolha dele.
 * `unrestricted` (Run Everything) só com opt-in explícito: `--unrestricted`.
 * Itens de `permissions.allow` / `permissions.deny` do template são somados (sem remover os do usuário).
 */
import { existsSync, readFileSync } from 'node:fs';
import { atomicWriteJson, readJsonObject } from '../../shared/json-io.js';
import { runCliMain } from '../../shared/cli-entry.js';

export const UNRESTRICTED = 'unrestricted';

export type MergeOptions = { unrestricted?: boolean };

function mergeList(current: unknown, extra: unknown): [unknown[], boolean] {
  const out = Array.isArray(current) ? [...current] : [];
  let mutated = !Array.isArray(current);
  for (const item of Array.isArray(extra) ? extra : []) {
    if (!out.includes(item)) {
      out.push(item);
      mutated = true;
    }
  }
  return [out, mutated];
}

export function mergeConfig(
  existing: Record<string, unknown>,
  template: Record<string, unknown>,
  options: MergeOptions = {},
): [Record<string, unknown>, boolean] {
  const merged = { ...existing };
  let mutated = false;

  for (const [key, value] of Object.entries(template)) {
    if (key === 'permissions') {
      const perms = { ...((merged.permissions as Record<string, unknown> | undefined) ?? {}) };
      const tplPerms =
        typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
      for (const listKey of ['allow', 'deny'] as const) {
        const [list, changed] = mergeList(perms[listKey], tplPerms[listKey]);
        perms[listKey] = list;
        mutated ||= changed;
      }
      merged.permissions = perms;
      continue;
    }

    if (!(key in merged)) {
      merged[key] = value;
      mutated = true;
    }
  }

  if (options.unrestricted && merged.approvalMode !== UNRESTRICTED) {
    merged.approvalMode = UNRESTRICTED;
    mutated = true;
  }

  if (merged.version !== template.version) {
    merged.version = template.version ?? 1;
    mutated = true;
  }

  return [merged, mutated];
}

export function applyAutoConfig(
  configPath: string,
  templatePath: string,
  options: MergeOptions = {},
): string {
  const template = JSON.parse(readFileSync(templatePath, 'utf-8')) as Record<string, unknown>;
  const existing = existsSync(configPath) ? readJsonObject(configPath) : null;
  const [merged, mutated] = mergeConfig(existing ?? {}, template, options);
  atomicWriteJson(configPath, merged);
  if (!existing) return 'created';
  return mutated ? 'merged' : 'ok';
}

function main(): number {
  const args = process.argv.slice(2);
  const unrestricted = args.includes('--unrestricted');
  const [configPath, templatePath] = args.filter((a) => !a.startsWith('--'));
  if (!configPath || !templatePath) {
    process.stderr.write(
      'Uso: merge-cursor-cli-config.ts <cli-config.json> <template.json> [--unrestricted]\n',
    );
    return 1;
  }

  try {
    process.stdout.write(applyAutoConfig(configPath, templatePath, { unrestricted }));
  } catch (err) {
    process.stderr.write(`Erro: ${String(err)}\n`);
    return 1;
  }
  return 0;
}

runCliMain(import.meta.url, main);
