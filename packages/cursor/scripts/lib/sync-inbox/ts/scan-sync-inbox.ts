#!/usr/bin/env node
/** Scan projetos do registry hostdime por trabalho não commitado + contexto recente. */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const TOOLING_MARKERS = ['.gitignore', '.cursor/', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];

const CONVENTIONAL_PREFIX = /^(feat|fix|chore|refactor|docs|test|style|perf|ci|build)(\([^)]+\))?:\s*/i;

interface GitInfo {
  branch: string;
  lastCommit: string;
  changedCount: number;
  stagedCount: number;
  unstagedCount: number;
  changedFiles: string[];
  porcelain: string;
}

interface ScanItem {
  path: string;
  name: string;
  branch: string;
  changedCount: number;
  stagedCount: number;
  unstagedCount: number;
  changedFiles: string[];
  recentFiles: string[];
  lastCommit: string;
  lastUserQuery: string | null;
  summary: string;
  detail: string;
  objective: string;
  scannedAt: string;
}

function cursorProjectDirName(repoPath: string): string {
  return resolve(repoPath).replaceAll(sep, '-').replace(/^-/, '');
}

function projectSlug(path: string): string {
  return path
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function findTranscriptDir(cursorDir: string, repoPath: string): string | null {
  const projects = join(cursorDir, 'projects');
  if (!existsSync(projects)) return null;

  const exact = join(projects, cursorProjectDirName(repoPath), 'agent-transcripts');
  if (existsSync(exact)) return exact;

  const slug = projectSlug(repoPath);
  const repoName = basename(repoPath).toLowerCase();
  const candidates: string[] = [];

  for (const entry of readdirSync(projects, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const name = entry.name.toLowerCase();
    if (name.includes(slug) || name.endsWith(`-${repoName}`)) {
      const cand = join(projects, entry.name, 'agent-transcripts');
      if (existsSync(cand)) candidates.push(cand);
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return candidates[0]!;
}

function loadRecentFiles(cursorDir: string, repoPath: string, limit = 5): string[] {
  const stateFile = join(cursorDir, 'ide_state.json');
  if (!existsSync(stateFile)) return [];

  let data: { recentlyViewedFiles?: Array<{ absolutePath?: string }> };
  try {
    data = JSON.parse(readFileSync(stateFile, 'utf-8')) as typeof data;
  } catch {
    return [];
  }

  const repo = resolve(repoPath);
  const prefix = `${repo}${sep}`;
  const files: string[] = [];

  for (const entry of data.recentlyViewedFiles ?? []) {
    const absolute = entry.absolutePath ?? '';
    if (!absolute.startsWith(prefix)) continue;
    const rel = absolute.slice(prefix.length);
    if (rel && !files.includes(rel)) files.push(rel);
    if (files.length >= limit) break;
  }
  return files;
}

function isNoiseQuery(text: string): boolean {
  const lower = text.toLowerCase();
  const noiseMarkers = [
    'responda somente em json',
    'analise o contexto de retomada',
    '{"doing":',
    '<user_info>',
    'you are auto, an agent router',
  ];
  return noiseMarkers.some((marker) => lower.includes(marker));
}

function cleanUserQuery(text: string): string {
  let cleaned = text
    .replace(/<user_query>\s*/g, '')
    .replace(/\s*<\/user_query>/g, '')
    .replace(/<image_files>.*?<\/image_files>/gs, '')
    .replace(/\[Image\]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const first = cleaned.split(/(?<=[.!?])\s+|\n+/)[0]!.trim();
  return first.length > 120 ? `${first.slice(0, 119)}…` : first;
}

function walkJsonlFiles(dir: string): string[] {
  const results: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.endsWith('.jsonl')) results.push(full);
    }
  }
  return results;
}

function latestUserQuery(transcriptDir: string): string | null {
  const files = walkJsonlFiles(transcriptDir)
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
    .slice(0, 8);

  for (const fp of files) {
    try {
      const lines = readFileSync(fp, 'utf-8').split('\n').filter(Boolean).reverse();
      for (const line of lines) {
        const row = JSON.parse(line) as {
          role?: string;
          message?: { content?: Array<{ type?: string; text?: string }> };
        };
        if (row.role !== 'user') continue;
        for (const part of row.message?.content ?? []) {
          if (part.type !== 'text') continue;
          const text = cleanUserQuery(part.text ?? '');
          if (text.length > 10 && !isNoiseQuery(text)) return text;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function shortenCommit(message: string, maxLen = 72): string {
  const text = message.trim().replace(CONVENTIONAL_PREFIX, '');
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trim()}…`;
}

function basenameOnly(path: string): string {
  if (path.endsWith('/')) return `${basename(path.replace(/\/$/, ''))}/`;
  return basename(path);
}

function inferAreas(changedFiles: string[]): string[] {
  const areas: string[] = [];
  for (const raw of changedFiles) {
    const path = raw.replace(/\\/g, '/');
    const module = path.match(/\/modules\/([^/]+)\//);
    if (module) {
      areas.push(module[1]!);
      continue;
    }
    if (path.includes('/components/')) {
      const part = basename(path).replace(/\.[^.]+$/, '');
      if (!['index', 'types'].includes(part)) areas.push(part);
      continue;
    }
    if (path.includes('/doc/') || path.endsWith('.md')) {
      areas.push('documentação');
      continue;
    }
    if (path.toLowerCase().includes('test')) {
      areas.push('testes');
      continue;
    }
    const name = basenameOnly(path);
    if (!areas.includes(name)) areas.push(name);
  }

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const area of areas) {
    const key = area.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(area);
  }
  return deduped.slice(0, 4);
}

function isToolingOnly(changedFiles: string[]): boolean {
  if (changedFiles.length === 0) return false;
  for (const raw of changedFiles) {
    const path = raw.replace(/\\/g, '/');
    if (TOOLING_MARKERS.some((marker) => path.includes(marker))) continue;
    if (path.startsWith('.cursor/')) continue;
    return false;
  }
  return true;
}

function featureBranchLabel(branch: string): string | null {
  if (!branch || ['main', 'master', 'develop', 'dev', '(detached)'].includes(branch)) {
    return null;
  }
  return branch.replace(/-/g, ' ').replace(/_/g, ' ');
}

function buildResume(params: {
  branch: string;
  changedCount: number;
  changedFiles: string[];
  lastCommit: string | null;
  lastQuery: string | null;
  recentFiles: string[];
}): [string, string, string] {
  const { branch, changedCount, changedFiles, lastCommit, lastQuery, recentFiles } = params;
  const areas = inferAreas(changedFiles.length > 0 ? changedFiles : recentFiles);
  const branchHint = featureBranchLabel(branch);
  const n = changedCount;

  let summary: string;
  if (lastQuery) {
    summary = `Pedido: ${lastQuery}`;
  } else if (isToolingOnly(changedFiles)) {
    summary = 'Setup Cursor / sync do projeto';
  } else if (areas.length > 0 && !['documentação', 'testes', '.gitignore', 'gitignore'].includes(areas[0]!)) {
    const lead = areas[0]!;
    summary =
      branchHint && !lead.toLowerCase().includes(branchHint.toLowerCase())
        ? `${branchHint} — ${lead}`
        : lead;
    if (areas.length > 1) summary += ` (+${areas.length - 1})`;
  } else if (branchHint) {
    summary = `Branch ${branchHint}`;
  } else if (lastCommit) {
    summary = shortenCommit(lastCommit);
  } else {
    summary = `${n} arquivo(s) em andamento`;
  }

  const detailParts: string[] = [];
  if (branch) detailParts.push(branch);
  detailParts.push(`${n} arquivo${n !== 1 ? 's' : ''}`);
  if (areas.length > 0) detailParts.push(areas.slice(0, 2).join(', '));
  else if (recentFiles.length > 0) detailParts.push(basenameOnly(recentFiles[0]!));
  const detail = detailParts.join(' · ');

  const objectiveParts: string[] = [];
  if (lastQuery) objectiveParts.push(`Último pedido: ${lastQuery}`);
  if (branchHint) objectiveParts.push(`Branch: ${branch}`);
  if (areas.length > 0) objectiveParts.push(`Áreas: ${areas.slice(0, 3).join(', ')}`);
  else if (changedFiles.length > 0) {
    objectiveParts.push(`Arquivos: ${changedFiles.slice(0, 4).map(basenameOnly).join(', ')}`);
  }
  if (lastCommit && !lastQuery) objectiveParts.push(`Commit: ${shortenCommit(lastCommit, 60)}`);
  const objective = objectiveParts.length > 0 ? objectiveParts.join(' · ') : summary;

  return [summary, detail, objective];
}

function gitInfo(repo: string): GitInfo | null {
  if (!existsSync(join(repo, '.git'))) return null;

  const run = (args: string[]): string => {
    const proc = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf-8' });
    return (proc.stdout ?? '').trim();
  };

  try {
    const check = spawnSync('git', ['-C', repo, 'rev-parse', '--git-dir'], { encoding: 'utf-8' });
    if (check.status !== 0) return null;
  } catch {
    return null;
  }

  const porcelain = run(['status', '--porcelain']);
  if (!porcelain) return null;

  const branch = run(['branch', '--show-current']) || '(detached)';
  const lastCommit = run(['log', '-1', '--pretty=%s']);

  const changed: Array<{ code: string; path: string }> = [];
  for (const line of porcelain.split('\n')) {
    if (line.length < 4) continue;
    let path = line.slice(3).trim();
    if (path.includes(' -> ')) path = path.split(' -> ')[1] ?? path;
    changed.push({ code: line.slice(0, 2), path });
  }

  const staged = changed.filter((c) => c.code[0] !== ' ' && c.code[0] !== '?').length;
  const unstaged = changed.filter((c) => c.code[1] !== ' ').length;

  return {
    branch,
    lastCommit,
    changedCount: changed.length,
    stagedCount: staged,
    unstagedCount: unstaged,
    changedFiles: changed.slice(0, 12).map((c) => c.path),
    porcelain,
  };
}

export function scanProjects(registryPath: string, cursorDir: string): ScanItem[] {
  if (!existsSync(registryPath)) return [];

  const data = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
    projects?: Array<{ path?: string }>;
  };
  const results: ScanItem[] = [];
  const seen = new Set<string>();

  for (const entry of data.projects ?? []) {
    const path = entry.path ?? '';
    if (!path) continue;
    const repo = resolve(path);
    const key = repo;
    if (seen.has(key) || !existsSync(repo)) continue;
    seen.add(key);

    const git = gitInfo(repo);
    if (!git) continue;

    const transcripts = findTranscriptDir(cursorDir, repo);
    const lastQuery = transcripts ? latestUserQuery(transcripts) : null;
    const recentFiles = loadRecentFiles(cursorDir, repo);
    const [summary, detail, objective] = buildResume({
      branch: git.branch,
      changedCount: git.changedCount,
      changedFiles: git.changedFiles,
      lastCommit: git.lastCommit,
      lastQuery,
      recentFiles,
    });

    results.push({
      path: repo,
      name: basename(repo),
      branch: git.branch,
      changedCount: git.changedCount,
      stagedCount: git.stagedCount,
      unstagedCount: git.unstagedCount,
      changedFiles: git.changedFiles,
      recentFiles,
      lastCommit: git.lastCommit,
      lastUserQuery: lastQuery,
      summary,
      detail,
      objective,
      scannedAt: new Date().toISOString(),
    });
  }

  results.sort((a, b) => {
    const hasChatA = a.lastUserQuery ? 0 : 1;
    const hasChatB = b.lastUserQuery ? 0 : 1;
    const toolingA = isToolingOnly(a.changedFiles) ? 0 : 1;
    const toolingB = isToolingOnly(b.changedFiles) ? 0 : 1;
    if (hasChatA !== hasChatB) return hasChatA - hasChatB;
    if (toolingA !== toolingB) return toolingA - toolingB;
    return b.changedCount - a.changedCount;
  });

  return results;
}

function main(): number {
  const cursorDir = process.env.CURSOR_USER_DIR ?? join(homedir(), '.cursor');
  let registry = join(cursorDir, 'hostdime-ia/projects.json');
  let outPath = join(cursorDir, 'hostdime-ia/sync-inbox.json');

  if (process.argv.length > 2 && process.argv[2] === '--registry') {
    registry = process.argv[3]!;
  }
  if (process.argv.length > 2 && process.argv[2] === '--out') {
    outPath = process.argv[3]!;
  }

  const items = scanProjects(registry, cursorDir);
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    items,
  };

  mkdirSync(join(outPath, '..'), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  process.stdout.write(JSON.stringify(payload));
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}
