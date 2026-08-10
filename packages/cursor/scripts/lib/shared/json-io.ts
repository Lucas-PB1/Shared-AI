/**
 * JSON I/O atômico e leitura tipada — shared por merge-hooks / cli config.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function atomicWriteJson(filePath: string, data: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const text = `${JSON.stringify(data, null, 2)}\n`;
  const tmp = filePath.endsWith('.json')
    ? filePath.replace(/\.json$/, '.json.tmp')
    : `${filePath}.tmp`;
  writeFileSync(tmp, text, 'utf-8');
  renameSync(tmp, filePath);
}

export function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function readJsonObject(filePath: string): Record<string, unknown> {
  const data = readJsonFile(filePath);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error(`${filePath}: raiz deve ser objeto JSON`);
  }
  return data as Record<string, unknown>;
}

/** Carrega hooks.json existente, template ou scaffold vazio. */
export function loadHooksJsonDocument(
  hooksPath: string,
  examplePath: string | null = null,
): { data: Record<string, unknown>; action: 'ok' | 'created' } {
  if (existsSync(hooksPath)) {
    try {
      return { data: readJsonObject(hooksPath), action: 'ok' };
    } catch (err) {
      throw new Error(String(err));
    }
  }
  if (examplePath && existsSync(examplePath)) {
    return { data: readJsonObject(examplePath), action: 'created' };
  }
  return { data: { version: 1, hooks: {} }, action: 'created' };
}

export function getHooksObject(data: Record<string, unknown>): Record<string, unknown> {
  let hooks = data.hooks;
  if (hooks === undefined) {
    hooks = {};
    data.hooks = hooks;
  }
  if (typeof hooks !== 'object' || hooks === null || Array.isArray(hooks)) {
    throw new Error('hooks.json: campo "hooks" inválido');
  }
  return hooks as Record<string, unknown>;
}

export function getHookEventList(
  hooksObj: Record<string, unknown>,
  event: string,
): unknown[] {
  let list = hooksObj[event];
  if (list === undefined) {
    list = [];
    hooksObj[event] = list;
  }
  if (!Array.isArray(list)) {
    throw new Error(`hooks.json: "${event}" deve ser uma lista`);
  }
  return list;
}
