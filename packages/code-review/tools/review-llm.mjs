#!/usr/bin/env node
/**
 * /avaliar LLM — gera relatório no formato do command /avaliar.
 * Uso: REVIEW_LLM_API_KEY=... node review-llm.mjs --project PATH --file REL_PATH [--static-file FILE] [--diff-file FILE] [--output FILE]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveContextForFile, scopeMatchesFile } from './review-skill-routing.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { project: '', file: '', staticFile: '', diffFile: '', output: '' };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--project') args.project = argv[++i] ?? '';
    else if (arg === '--file') args.file = argv[++i] ?? '';
    else if (arg === '--static-file') args.staticFile = argv[++i] ?? '';
    else if (arg === '--diff-file') args.diffFile = argv[++i] ?? '';
    else if (arg === '--output') args.output = argv[++i] ?? '';
    else if (arg.startsWith('--project=')) args.project = arg.slice(10);
    else if (arg.startsWith('--file=')) args.file = arg.slice(7);
    else if (arg.startsWith('--static-file=')) args.staticFile = arg.slice(14);
    else if (arg.startsWith('--diff-file=')) args.diffFile = arg.slice(12);
    else if (arg.startsWith('--output=')) args.output = arg.slice(9);
  }
  return args;
}

export { parseArgs };

function inferStack(file) {
  if (file.endsWith('.tsx')) return 'TypeScript / React';
  if (file.endsWith('.ts')) return 'TypeScript';
  if (file.endsWith('.jsx')) return 'JavaScript / React';
  if (/\.(js|mjs|cjs)$/.test(file)) return 'JavaScript';
  if (file.endsWith('.php')) return 'PHP';
  if (/\.(css|scss)$/i.test(file)) return 'CSS';
  if (file.includes('constants/layout.ts')) return 'Tailwind / layout.ts';
  return '—';
}

export { inferStack };

function readOptional(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function convencoesForFile(project, relFile) {
  const convPath = path.join(project, '.cursor/review/convencoes.md');
  if (!fs.existsSync(convPath)) return '';
  const content = fs.readFileSync(convPath, 'utf8');
  const lines = content.split('\n');
  const bullets = [];
  let inSection = false;

  for (const line of lines) {
    const scopeMatch = line.match(/^## Escopo: (.+)$/);
    if (scopeMatch) {
      inSection = scopeMatchesFile(scopeMatch[1].trim(), relFile);
      continue;
    }
    if (/^## /.test(line)) inSection = false;
    if (inSection && line.startsWith('- ')) bullets.push(line);
  }
  return bullets.join('\n');
}

function exclusionsForFile(project, relFile) {
  const candidates = [
    path.join(project, '.cursor/review/exclusions.yaml'),
    path.join(project, '.cursor/review/context.yaml'),
  ];
  let raw = '';
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      raw = fs.readFileSync(p, 'utf8');
      break;
    }
  }
  if (!raw) return '';

  const items = [];
  let current = null;
  for (const line of raw.split('\n')) {
    if (/^\s*- id:/.test(line) || /^\s*- scope:/.test(line)) {
      if (current?.reason) items.push(current);
      current = { scope: '**/*', decision: '', reason: '' };
    }
    if (!current) continue;
    const scope = line.match(/^\s*scope:\s*["']?([^"'\n]+)/);
    const decision = line.match(/^\s*decision:\s*(\S+)/);
    const reason = line.match(/^\s*reason:\s*["']?(.+?)["']?\s*$/);
    if (scope) current.scope = scope[1].trim();
    if (decision) current.decision = decision[1];
    if (reason) current.reason = reason[1].trim();
  }
  if (current?.reason) items.push(current);

  return items
    .filter((item) => /rejeitado|nao-aplicavel/.test(item.decision))
    .filter((item) => scopeMatchesFile(item.scope, relFile))
    .map((item) => `- [${item.decision}] ${item.reason}`)
    .join('\n');
}

function loadSystemPrompt() {
  const templatePath = path.join(__dirname, '../templates/avaliar-llm-system.md');
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf8');
  }
  return 'You are a code reviewer. Output /avaliar format markdown only.';
}

async function callOpenAI(system, user) {
  const apiKey = process.env.REVIEW_LLM_API_KEY;
  const model = process.env.REVIEW_LLM_MODEL || 'gpt-4o-mini';
  const baseUrl = (process.env.REVIEW_LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${err.slice(0, 500)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function callAnthropic(system, user) {
  const apiKey = process.env.REVIEW_LLM_API_KEY;
  const model = process.env.REVIEW_LLM_MODEL || 'claude-sonnet-4-20250514';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 500)}`);
  }

  const data = await res.json();
  const block = data.content?.find((b) => b.type === 'text');
  return block?.text?.trim() ?? '';
}

function resolveProvider() {
  if (process.env.REVIEW_LLM_PROVIDER) {
    return process.env.REVIEW_LLM_PROVIDER.toLowerCase();
  }
  if (process.env.CURSOR_API_KEY) return 'cursor';
  return 'openai';
}

function resolveAgentBin() {
  const candidates = [
    process.env.CURSOR_AGENT_BIN,
    `${process.env.HOME}/.cursor/bin/agent`,
    `${process.env.HOME}/.local/bin/agent`,
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return 'agent';
}

async function callCursor(system, user) {
  const apiKey = process.env.CURSOR_API_KEY || process.env.REVIEW_LLM_API_KEY;
  if (!apiKey) {
    throw new Error('CURSOR_API_KEY não definido');
  }

  const prompt = `${system}\n\n---\n\n${user}`;
  const agent = resolveAgentBin();
  const args = ['-p', '--force', prompt];
  if (process.env.REVIEW_LLM_MODEL) {
    args.push('--model', process.env.REVIEW_LLM_MODEL);
  }

  const result = spawnSync(agent, args, {
    encoding: 'utf8',
    env: { ...process.env, CURSOR_API_KEY: apiKey },
    maxBuffer: 15 * 1024 * 1024,
    timeout: 600_000,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || 'agent failed').trim();
    throw new Error(`Cursor agent exit ${result.status}: ${err.slice(0, 800)}`);
  }

  return result.stdout.trim();
}

async function callLLM(system, user) {
  const provider = resolveProvider();
  if (provider === 'cursor') return callCursor(system, user);
  if (provider === 'anthropic') return callAnthropic(system, user);
  return callOpenAI(system, user);
}

function buildUserPrompt({
  relFile,
  stack,
  source,
  diff,
  staticOut,
  convencoes,
  exclusions,
  skillsContext,
  skillIds,
  ruleIds,
}) {
  const routingMeta = [
    skillIds?.length ? `Skills: ${skillIds.join(', ')}` : 'Skills: (none matched)',
    ruleIds?.length ? `Rules: ${ruleIds.join(', ')}` : 'Rules: (none matched)',
  ].join('\n');

  return [
    `File: ${relFile}`,
    `Stack: ${stack}`,
    routingMeta,
    '',
    '--- PROJECT SKILLS & RULES (apply architecture/conventions) ---',
    skillsContext || '(no project skills or rules for this path)',
    '',
    '--- SOURCE (full file) ---',
    source,
    '',
    '--- DIFF (hunks in this PR) ---',
    diff || '(no diff hunks — file may be new)',
    '',
    '--- STATIC ANALYSIS (filter; do not paste raw) ---',
    staticOut || '(no static findings)',
    '',
    '--- CONVENÇÕES (apply when relevant) ---',
    convencoes || '(none for this scope)',
    '',
    '--- EXCLUSIONS (never suggest these again) ---',
    exclusions || '(none)',
    '',
    'Produce the /avaliar markdown report now.',
  ].join('\n');
}

export { buildUserPrompt };

export function parseVerdict(report) {
  const match = report.match(/^\*\*Veredito:\*\*\s*(.+)$/m);
  if (!match) return 'Ajustes necessários';
  const v = match[1].trim();
  if (/^OK$/i.test(v)) return 'OK';
  if (/n[aã]o recomendado/i.test(v)) return 'Não recomendado';
  return 'Ajustes necessários';
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.project || !args.file) {
    console.error('Uso: review-llm.mjs --project PATH --file REL_PATH [--static-file FILE] [--diff-file FILE] [--output FILE]');
    process.exit(1);
  }

  const provider = resolveProvider();
  const hasKey =
    provider === 'cursor'
      ? Boolean(process.env.CURSOR_API_KEY || process.env.REVIEW_LLM_API_KEY)
      : Boolean(process.env.REVIEW_LLM_API_KEY);

  if (!hasKey) {
    const keyName = provider === 'cursor' ? 'CURSOR_API_KEY' : 'REVIEW_LLM_API_KEY';
    console.error(`Erro: ${keyName} não definido.`);
    process.exit(1);
  }

  const absFile = path.join(args.project, args.file);
  if (!fs.existsSync(absFile)) {
    console.error(`Erro: arquivo não encontrado: ${absFile}`);
    process.exit(1);
  }

  const source = fs.readFileSync(absFile, 'utf8');
  const stack = inferStack(args.file);
  const staticOut = readOptional(args.staticFile);
  const diff = readOptional(args.diffFile);
  const convencoes = convencoesForFile(args.project, args.file);
  const exclusions = exclusionsForFile(args.project, args.file);
  const codeReviewRoot = process.env.HOSTDIME_IA_ROOT
    ? path.join(process.env.HOSTDIME_IA_ROOT, 'packages/code-review')
    : path.join(__dirname, '..');
  const skillContext = resolveContextForFile(args.project, args.file, { codeReviewRoot });
  const system = loadSystemPrompt();
  const user = buildUserPrompt({
    relFile: args.file,
    stack,
    source,
    diff,
    staticOut,
    convencoes,
    exclusions,
    skillsContext: skillContext.contextText,
    skillIds: skillContext.skillIds,
    ruleIds: skillContext.ruleIds,
  });

  const report = await callLLM(system, user);
  if (!report) {
    console.error('Erro: LLM retornou resposta vazia.');
    process.exit(1);
  }

  if (args.output) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, report);
  } else {
    process.stdout.write(report);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
