#!/usr/bin/env node
/** Match paths against .cursor/history/watches.json scopes. */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, posix, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

type WatchRecord = Record<string, unknown> & {
  id?: string;
  scope?: string;
  scopeKind?: string;
  historyFile?: string;
  format?: string;
  enabled?: boolean;
  matchedFiles?: string[];
  pendingFiles?: string[];
  changedInScope?: string[];
};

function normalizePath(path: string): string {
  return posix.normalize(path.replace(/\\/g, '/').replace(/^\.\//, ''));
}

function fnmatch(name: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`).test(name);
}

function scopeToGlob(scope: string, scopeKind: string): string {
  const normalized = normalizePath(scope);
  if (scopeKind === 'file') return normalized;
  if (scopeKind === 'dir') return `${normalized.replace(/\/$/, '')}/**`;
  return normalized;
}

export function pathMatches(path: string, scope: string, scopeKind: string): boolean {
  const normPath = normalizePath(path);
  const normScope = normalizePath(scope);
  if (scopeKind === 'file') return normPath === normScope;

  const globPattern = scopeToGlob(normScope, scopeKind);
  if (globPattern.includes('**')) {
    const prefix = globPattern.split('**', 1)[0]!.replace(/\/$/, '');
    if (prefix && normPath !== prefix && !normPath.startsWith(`${prefix}/`)) {
      return false;
    }
    const suffix = globPattern.slice(prefix.length).replace(/^\//, '');
    if (suffix === '' || suffix === '**' || suffix === '**/*') return true;
    const tail = prefix ? normPath.slice(prefix.length + 1) : normPath;
    return fnmatch(tail, suffix.replace(/^\*\*\//, ''));
  }

  return fnmatch(normPath, globPattern) || fnmatch(basename(normPath), globPattern);
}

export function loadWatches(watchesPath: string): { version: number; watches: WatchRecord[] } {
  if (!existsSync(watchesPath)) {
    return { version: 1, watches: [] };
  }
  const data = JSON.parse(readFileSync(watchesPath, 'utf-8')) as Record<string, unknown>;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('watches.json deve ser um objeto JSON');
  }
  if (data.version !== 1) {
    throw new Error('watches.json: version deve ser 1');
  }
  const watches = data.watches;
  if (!Array.isArray(watches)) {
    throw new Error('watches.json: "watches" deve ser uma lista');
  }
  return data as { version: number; watches: WatchRecord[] };
}

export function validateWatches(data: { watches?: unknown[] }): string[] {
  const errors: string[] = [];
  const idRe = /^[a-z0-9][a-z0-9-]*$/;
  const watches = data.watches ?? [];
  const seen = new Set<string>();

  watches.forEach((watch, i) => {
    const prefix = `watches[${i}]`;
    if (typeof watch !== 'object' || watch === null) {
      errors.push(`${prefix}: deve ser objeto`);
      return;
    }
    const w = watch as WatchRecord;
    for (const key of ['id', 'scope', 'scopeKind', 'historyFile', 'format', 'enabled'] as const) {
      if (!(key in w)) errors.push(`${prefix}: falta campo '${key}'`);
    }
    const wid = String(w.id ?? '');
    if (!idRe.test(wid)) {
      errors.push(`${prefix}: id inválido '${wid}'`);
    } else if (seen.has(wid)) {
      errors.push(`${prefix}: id duplicado '${wid}'`);
    } else {
      seen.add(wid);
    }
    if (!['glob', 'file', 'dir'].includes(String(w.scopeKind ?? ''))) {
      errors.push(`${prefix}: scopeKind inválido`);
    }
    if (!['okf-log', 'markdown'].includes(String(w.format ?? ''))) {
      errors.push(`${prefix}: format inválido`);
    }
    if (typeof w.enabled !== 'boolean') {
      errors.push(`${prefix}: enabled deve ser boolean`);
    }
  });

  return errors;
}

export function matchFiles(watchesPath: string, files: string[]): WatchRecord[] {
  const data = loadWatches(watchesPath);
  const results: WatchRecord[] = [];

  for (const watch of data.watches) {
    if (watch.enabled === false) continue;
    const scope = String(watch.scope ?? '');
    const kind = String(watch.scopeKind ?? 'glob');
    const matched = files.filter((f) => pathMatches(f, scope, kind));
    if (matched.length > 0) {
      const entry = { ...watch };
      entry.matchedFiles = [...new Set(matched.map(normalizePath))].sort();
      results.push(entry);
    }
  }
  return results;
}

function extractPathsFromJson(obj: unknown, out: Set<string>): void {
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
    for (const [key, val] of Object.entries(obj)) {
      if (
        ['file_path', 'path', 'filePath', 'edited_file', 'editedFile'].includes(key) &&
        typeof val === 'string'
      ) {
        out.add(val);
      }
      extractPathsFromJson(val, out);
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) extractPathsFromJson(item, out);
  } else if (typeof obj === 'string') {
    if (obj.includes('/') || obj.includes('\\')) {
      if (/^[\w./\\-]+\.(md|ts|tsx|js|jsx|json|yaml|yml|sh|ps1)$/.test(obj)) {
        out.add(obj);
      }
    }
  }
}

export function gitChangedFiles(cwd: string, base = 'HEAD'): string[] {
  const paths = new Set<string>();

  const run = (args: string[]): void => {
    try {
      const proc = spawnSync(args[0]!, args.slice(1), {
        cwd,
        encoding: 'utf-8',
      });
      if (proc.status !== 0) return;
      for (const line of (proc.stdout ?? '').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.length >= 4 && ['??', ' M', 'M ', 'A ', ' D', 'D '].includes(trimmed.slice(0, 2))) {
          paths.add(trimmed.slice(3).trim());
        } else {
          paths.add(trimmed);
        }
      }
    } catch {
      // ignore
    }
  };

  run(['git', 'diff', '--name-only', base]);
  run(['git', 'diff', '--cached', '--name-only', base]);
  if (base === 'HEAD') {
    run(['git', 'ls-files', '--others', '--exclude-standard']);
  }

  return [...paths].map(normalizePath).filter(Boolean).sort();
}

function collectEditedFiles(hookInput: Record<string, unknown> | null, projectRoot: string): string[] {
  const paths = new Set<string>();
  if (hookInput) extractPathsFromJson(hookInput, paths);
  for (const p of gitChangedFiles(projectRoot)) paths.add(p);
  const envFiles = process.env.SHARED_AI_HISTORICO_EDITED_FILES ?? '';
  for (const part of envFiles.split(':')) {
    const trimmed = part.trim();
    if (trimmed) paths.add(trimmed);
  }
  return [...paths].map(normalizePath).filter(Boolean).sort();
}

function buildFollowup(matches: WatchRecord[]): string {
  const lines = [
    'History watch: arquivos do escopo foram alterados neste turno.',
    'Append no histórico **antes** de encerrar:',
  ];
  for (const m of matches) {
    const refs = (m.matchedFiles ?? m.pendingFiles ?? [])
      .slice(0, 8)
      .map((f) => `\`${f}\``)
      .join(', ');
    const fmt = m.format ?? 'markdown';
    lines.push(
      `- Watch \`${m.id}\` → [\`${m.historyFile}\`](${m.historyFile}) (format: ${fmt}). Refs: ${refs}`,
    );
  }
  lines.push('Campos: timestamp, o quê, refs, por quê. Ler skill `history-watch`.');
  return lines.join('\n');
}

function splitHistorySections(text: string, maxSections = 5): string[] {
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of text.split('\n')) {
    if (line.startsWith('## ') && current.length > 0) {
      sections.push(current.join('\n'));
      if (sections.length >= maxSections) break;
      current = [line];
    } else if (line.startsWith('## ')) {
      current = [line];
    } else if (current.length > 0) {
      current.push(line);
    }
  }
  if (current.length > 0 && sections.length < maxSections) {
    sections.push(current.join('\n'));
  }
  return sections;
}

function extractRefsFromHistory(historyPath: string, fmt: string, maxSections = 3): Set<string> {
  if (!existsSync(historyPath)) return new Set();

  const text = readFileSync(historyPath, 'utf-8');
  const refs = new Set<string>();
  const sections = splitHistorySections(text, maxSections);

  for (const section of sections) {
    if (fmt === 'okf-log') {
      for (const match of section.matchAll(/refs:\s*\[([^\]]+)\]/gi)) {
        const chunk = match[1]!;
        for (const link of chunk.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
          refs.add(normalizePath(link[1]!));
        }
        for (const tick of chunk.matchAll(/`([^`]+)`/g)) {
          refs.add(normalizePath(tick[1]!));
        }
      }
      for (const match of section.matchAll(/refs:\s*`([^`]+)`/gi)) {
        refs.add(normalizePath(match[1]!));
      }
    } else {
      for (const line of section.split('\n')) {
        if (line.trim().toLowerCase().startsWith('- **refs:**')) {
          for (const tick of line.matchAll(/`([^`]+)`/g)) {
            refs.add(normalizePath(tick[1]!));
          }
        }
      }
    }
  }
  return refs;
}

function fileMtime(projectRoot: string, relPath: string): number {
  try {
    return statSync(resolve(projectRoot, relPath)).mtimeMs / 1000;
  } catch {
    return 0;
  }
}

function pendingFilesForWatch(
  projectRoot: string,
  watch: WatchRecord,
  changedFiles: string[],
): string[] {
  const scope = String(watch.scope ?? '');
  const kind = String(watch.scopeKind ?? 'glob');
  const matched = [
    ...new Set(changedFiles.filter((f) => pathMatches(f, scope, kind)).map(normalizePath)),
  ].sort();
  if (matched.length === 0) return [];

  const historyPath = resolve(projectRoot, String(watch.historyFile ?? ''));
  const recentRefs = extractRefsFromHistory(historyPath, String(watch.format ?? 'markdown'));
  const historyMtime = existsSync(historyPath) ? statSync(historyPath).mtimeMs / 1000 : 0;

  const pending: string[] = [];
  for (const rel of matched) {
    const newerThanLog = fileMtime(projectRoot, rel) > historyMtime + 1;
    const missingRef = !recentRefs.has(rel);
    if (newerThanLog || missingRef) pending.push(rel);
  }
  return pending;
}

export function collectPendingWatches(
  projectRoot: string,
  watchesPath: string,
  base = 'HEAD',
): WatchRecord[] {
  if (!existsSync(watchesPath)) return [];

  const data = loadWatches(watchesPath);
  const changed = gitChangedFiles(projectRoot, base);
  if (changed.length === 0) return [];

  const pendingWatches: WatchRecord[] = [];
  for (const watch of data.watches) {
    if (watch.enabled === false) continue;
    const pending = pendingFilesForWatch(projectRoot, watch, changed);
    if (pending.length === 0) continue;
    const entry = { ...watch };
    entry.pendingFiles = pending;
    entry.changedInScope = [
      ...new Set(
        changed
          .filter((f) =>
            pathMatches(f, String(watch.scope ?? ''), String(watch.scopeKind ?? 'glob')),
          )
          .map(normalizePath),
      ),
    ].sort();
    pendingWatches.push(entry);
  }
  return pendingWatches;
}

function buildDraftEntry(watch: WatchRecord, pendingFiles: string[]): string {
  const now = new Date();
  const fmt = String(watch.format ?? 'markdown');
  const files = pendingFiles.slice(0, 12);

  if (fmt === 'okf-log') {
    const date = now.toISOString().slice(0, 10);
    const clock = now.toISOString().slice(11, 16);
    const refs = files.map((f) => `[${basename(f)}](${f})`).join(', ');
    return (
      `## ${date}\n` +
      `* **Update** (${clock} UTC): <descreva o que mudou> — refs: [${refs}] — motivo: <por quê>`
    );
  }

  const iso = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const refs = files.map((f) => `\`${f}\``).join(', ');
  return (
    `## ${iso}\n\n` +
    `- **O quê:** <descreva o que mudou>\n` +
    `- **Refs:** ${refs}\n` +
    `- **Por quê:** <motivo ou decisão>`
  );
}

function buildCatchupFollowup(pendingWatches: WatchRecord[]): string {
  const lines = [
    'History watch — catch-up manual: há alterações no escopo ainda não refletidas no log.',
    'Append no histórico (recentes primeiro) para cada watch abaixo:',
  ];
  for (const watch of pendingWatches) {
    const refs = (watch.pendingFiles ?? []).slice(0, 8).map((f) => `\`${f}\``).join(', ');
    lines.push(
      `- Watch \`${watch.id}\` → [\`${watch.historyFile}\`](${watch.historyFile}) (format: ${watch.format ?? 'markdown'}). Pendente: ${refs}`,
    );
  }
  lines.push(
    'Use os rascunhos de `npm run historico -- catch-up` ou complete o quê/por quê. Ler skill `history-watch`.',
  );
  return lines.join('\n');
}

interface ParsedArgs {
  json: boolean;
  check: boolean;
  base: string;
}

function parseProjectCommand(argv: string[]): [string, ParsedArgs, string[]] {
  const args: ParsedArgs = { json: false, check: false, base: 'HEAD' };
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--json') args.json = true;
    else if (arg === '--check') args.check = true;
    else if (arg === '--base') args.base = argv[++i] ?? 'HEAD';
    else if (arg.startsWith('--base=')) args.base = arg.slice(7);
    else rest.push(arg);
  }

  const project = rest[0] ? resolve(rest[0]) : process.cwd();
  return [project, args, rest];
}

function cmdPending(
  projectRoot: string,
  watchesPath: string,
  { base, asJson, checkOnly }: { base: string; asJson: boolean; checkOnly: boolean },
): number {
  const pending = collectPendingWatches(projectRoot, watchesPath, base);
  if (asJson) {
    const payload = {
      project: projectRoot,
      base,
      hasPending: pending.length > 0,
      watches: pending.map((w) => ({
        id: w.id,
        scope: w.scope,
        historyFile: w.historyFile,
        format: w.format,
        pendingFiles: w.pendingFiles,
        changedInScope: w.changedInScope ?? [],
      })),
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return checkOnly && pending.length > 0 ? 1 : 0;
  }

  if (pending.length === 0) {
    process.stdout.write('Nenhuma pendência de log — escopos limpos ou sem alterações git.\n');
    return 0;
  }

  process.stdout.write(`Pendências de log (${pending.length} watch(es), base=${base}):\n\n`);
  for (const watch of pending) {
    process.stdout.write(`• ${watch.id} → ${watch.historyFile} (${watch.format})\n`);
    for (const rel of watch.pendingFiles ?? []) {
      process.stdout.write(`    - ${rel}\n`);
    }
    process.stdout.write('\n');
  }
  return checkOnly ? 1 : 0;
}

function cmdCatchUp(
  projectRoot: string,
  watchesPath: string,
  { base, asJson }: { base: string; asJson: boolean },
): number {
  const pending = collectPendingWatches(projectRoot, watchesPath, base);
  const drafts = pending.map((w) => ({
    watchId: w.id,
    historyFile: w.historyFile,
    format: w.format,
    pendingFiles: w.pendingFiles,
    draft: buildDraftEntry(w, w.pendingFiles ?? []),
  }));

  if (asJson) {
    const payload = {
      project: projectRoot,
      base,
      hasPending: pending.length > 0,
      followup_message: pending.length > 0 ? buildCatchupFollowup(pending) : '',
      drafts,
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return 0;
  }

  if (pending.length === 0) {
    process.stdout.write('Nenhuma pendência — log em dia para os escopos observados.\n');
    return 0;
  }

  process.stdout.write('=== Histórico — catch-up manual ===\n\n');
  process.stdout.write(`${buildCatchupFollowup(pending)}\n`);
  process.stdout.write('\n--- Rascunhos (append no topo do arquivo, após cabeçalho) ---\n\n');
  for (const item of drafts) {
    process.stdout.write(`### ${item.historyFile} (watch \`${item.watchId}\`)\n\n`);
    process.stdout.write(`${item.draft}\n\n`);
  }
  return 0;
}

function cmdDraft(
  projectRoot: string,
  watchesPath: string,
  watchId: string,
  { base, asJson }: { base: string; asJson: boolean },
): number {
  const pending = collectPendingWatches(projectRoot, watchesPath, base);
  const watch = pending.find((w) => w.id === watchId);
  if (!watch) {
    process.stderr.write(`Nenhuma pendência para watch '${watchId}'.\n`);
    return 1;
  }

  const draft = buildDraftEntry(watch, watch.pendingFiles ?? []);
  if (asJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          watchId,
          historyFile: watch.historyFile,
          pendingFiles: watch.pendingFiles,
          draft,
        },
        null,
        2,
      )}\n`,
    );
    return 0;
  }

  process.stdout.write(draft);
  return 0;
}

function cmdValidate(watchesPath: string): number {
  try {
    const data = loadWatches(watchesPath);
    const errors = validateWatches(data);
    if (errors.length > 0) {
      for (const err of errors) process.stderr.write(`${err}\n`);
      return 1;
    }
    process.stdout.write('ok');
    return 0;
  } catch (err) {
    process.stderr.write(`Erro: ${String(err)}\n`);
    return 1;
  }
}

function cmdStatus(watchesPath: string): number {
  try {
    const data = loadWatches(watchesPath);
    const watches = data.watches;
    if (watches.length === 0) {
      process.stdout.write('Nenhum watch configurado.\n');
      return 0;
    }
    for (const w of watches) {
      const state = w.enabled === false ? 'disabled' : 'enabled';
      process.stdout.write(
        `${w.id}: scope=${w.scope} (${w.scopeKind}) history=${w.historyFile} format=${w.format} [${state}]\n`,
      );
    }
    return 0;
  } catch (err) {
    process.stderr.write(`Erro: ${String(err)}\n`);
    return 1;
  }
}

function cmdScopeMatch(watchesPath: string, filePath: string): number {
  const matches = matchFiles(watchesPath, [filePath]);
  if (matches.length > 0) {
    process.stdout.write(`${JSON.stringify(matches, null, 2)}\n`);
    return 0;
  }
  process.stdout.write('no match');
  return 1;
}

function cmdStop(
  projectRoot: string,
  watchesPath: string,
  hookInput: Record<string, unknown> | null,
): number {
  if (!existsSync(watchesPath)) return 0;
  const files = collectEditedFiles(hookInput, projectRoot);
  if (files.length === 0) return 0;
  const matches = matchFiles(watchesPath, files);
  if (matches.length === 0) return 0;
  process.stdout.write(JSON.stringify({ followup_message: buildFollowup(matches) }));
  return 0;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function main(): Promise<number> {
  if (process.argv.length < 3) {
    process.stderr.write(
      'Uso: history-watch-match.ts <validate|status|scope-match|pending|catch-up|draft|stop> ...\n',
    );
    return 1;
  }

  const cmd = process.argv[2]!;

  if (cmd === 'stop') {
    let hookInput: Record<string, unknown> | null = null;
    if (!process.stdin.isTTY) {
      const raw = await readStdin();
      if (raw.trim()) {
        try {
          hookInput = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          hookInput = null;
        }
      }
    }
    const root = process.cwd();
    const wp = resolve(root, '.cursor/history/watches.json');
    return cmdStop(root, wp, hookInput);
  }

  if (cmd === 'pending' || cmd === 'catch-up') {
    const [project, args] = parseProjectCommand(process.argv.slice(3));
    const watchesPath = resolve(project, '.cursor/history/watches.json');
    if (cmd === 'pending') {
      return cmdPending(project, watchesPath, {
        base: args.base,
        asJson: args.json,
        checkOnly: args.check,
      });
    }
    return cmdCatchUp(project, watchesPath, { base: args.base, asJson: args.json });
  }

  if (cmd === 'draft') {
    if (process.argv.length < 4) {
      process.stderr.write('Uso: draft <watch-id> [--json] [--base=HEAD] [projeto]\n');
      return 1;
    }
    const watchId = process.argv[3]!;
    const [project, args] = parseProjectCommand(process.argv.slice(4));
    const watchesPath = resolve(project, '.cursor/history/watches.json');
    return cmdDraft(project, watchesPath, watchId, { base: args.base, asJson: args.json });
  }

  const projectRoot =
    process.argv.length > 3 && cmd !== 'stop' ? resolve(process.argv[3]!) : process.cwd();
  const watchesPath = resolve(projectRoot, '.cursor/history/watches.json');

  if (cmd === 'validate') return cmdValidate(watchesPath);
  if (cmd === 'status') return cmdStatus(watchesPath);
  if (cmd === 'scope-match') {
    if (process.argv.length < 5) {
      process.stderr.write('Uso: scope-match <projeto> <arquivo>\n');
      return 1;
    }
    return cmdScopeMatch(watchesPath, process.argv[4]!);
  }

  process.stderr.write(`Comando desconhecido: ${cmd}\n`);
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().then((code) => process.exit(code));
}
