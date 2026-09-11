#!/usr/bin/env node
/**
 * Append / summarize routing log em ~/.cursor/shared-ai/routing-log.jsonl
 *
 * Uso:
 *   npx tsx append-routing-log.ts append --skills=nestjs,typeorm --ask="..." --source=agent
 *   npx tsx append-routing-log.ts summary [--days=30]
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export type RoutingLogEntry = {
  ts: string;
  project: string | null;
  ask: string;
  skills: string[];
  excluded?: string[];
  source: 'agent' | 'skills-why' | 'manual';
};

export function defaultRoutingLogPath(): string {
  const override = process.env.SHARED_AI_ROUTING_LOG;
  if (override) return override;
  return join(homedir(), '.cursor', 'shared-ai', 'routing-log.jsonl');
}

function logPath(): string {
  return defaultRoutingLogPath();
}

function normalizeProjectPath(path: string | null | undefined): string {
  if (!path) return '';
  return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

export function sameProjectPath(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeProjectPath(a);
  const nb = normalizeProjectPath(b);
  return Boolean(na && nb && na === nb);
}

/** Entradas recentes primeiro, filtradas por path do projeto (metadado; o arquivo é global). */
export function readRoutingLogForProject(
  projectPath: string,
  days = 30,
): RoutingLogEntry[] {
  return readRoutingLog(days)
    .filter((row) => sameProjectPath(row.project, projectPath))
    .reverse();
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const a of argv) {
    if (a.startsWith('--') && a.includes('=')) {
      const i = a.indexOf('=');
      out[a.slice(2, i)] = a.slice(i + 1);
    } else if (a.startsWith('--')) {
      out[a.slice(2)] = true;
    } else if (!out._) {
      out._ = a;
    }
  }
  return out;
}

function splitList(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function appendRoutingLog(entry: RoutingLogEntry): string {
  const file = logPath();
  const dir = dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const line = `${JSON.stringify(entry)}\n`;
  appendFileSync(file, line, 'utf8');
  return file;
}

export function readRoutingLog(days = 30): RoutingLogEntry[] {
  const file = logPath();
  if (!existsSync(file)) return [];
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const entries: RoutingLogEntry[] = [];
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as RoutingLogEntry;
      const t = Date.parse(row.ts);
      if (!Number.isNaN(t) && t >= cutoff) entries.push(row);
    } catch {
      // skip bad lines
    }
  }
  return entries;
}

export function summarizeRoutingLog(days = 30): {
  entries: number;
  skillCounts: Record<string, number>;
  bySource: Record<string, number>;
} {
  const rows = readRoutingLog(days);
  const skillCounts: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const row of rows) {
    bySource[row.source] = (bySource[row.source] ?? 0) + 1;
    for (const s of row.skills) {
      skillCounts[s] = (skillCounts[s] ?? 0) + 1;
    }
  }
  return { entries: rows.length, skillCounts, bySource };
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  const cmd = String(args._ ?? 'append');

  if (cmd === 'summary') {
    const days = Number(args.days ?? 30) || 30;
    const summary = summarizeRoutingLog(days);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return 0;
  }

  if (cmd === 'path') {
    process.stdout.write(`${logPath()}\n`);
    return 0;
  }

  if (cmd !== 'append') {
    process.stderr.write(
      'Uso: append-routing-log.ts append --skills=a,b [--ask=...] [--project=...] [--source=agent|skills-why|manual] [--excluded=x,y]\n',
    );
    return 2;
  }

  const skills = splitList(args.skills);
  if (skills.length === 0) {
    process.stderr.write('Informe --skills=nome1,nome2\n');
    return 2;
  }

  const sourceRaw = String(args.source ?? 'manual');
  const source =
    sourceRaw === 'agent' || sourceRaw === 'skills-why' || sourceRaw === 'manual'
      ? sourceRaw
      : 'manual';

  const entry: RoutingLogEntry = {
    ts: nowIso(),
    project: typeof args.project === 'string' && args.project ? args.project : null,
    ask: typeof args.ask === 'string' ? args.ask.slice(0, 240) : '',
    skills,
    excluded: splitList(args.excluded),
    source,
  };

  const file = appendRoutingLog(entry);
  process.stdout.write(`ok ${file}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}
