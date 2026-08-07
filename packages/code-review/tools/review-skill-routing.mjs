#!/usr/bin/env node
/**
 * Roteamento de skills/rules do projeto para /avaliar no CI.
 * Espelha hostdime-skills-routing.mdc + globs de .cursor/rules/*.mdc
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_MAX_CHARS = 18_000;

/** @typedef {{ id: string, test: (file: string) => boolean, priority: number }} SkillRoute */

/** @type {SkillRoute[]} */
const HOSTDIME_SKILL_ROUTES = [
  {
    id: 'hostdime-module-fields',
    priority: 10,
    test: (f) =>
      /Fields\.tsx$/i.test(f) ||
      (/\/defaults\.ts$/i.test(f) && f.includes('/components/modules/')),
  },
  {
    id: 'hostdime-styling',
    priority: 12,
    test: (f) =>
      /\.(css|scss)$/i.test(f) ||
      /\/constants\/layout\.ts$/i.test(f) ||
      /\/styles\/[^/]+\.css$/i.test(f),
  },
  {
    id: 'hostdime-chrome',
    priority: 20,
    test: (f) =>
      /\/components\/modules\/(SiteMenuMain|SiteFooter|LandingHeader|LandingFooter)\//.test(f),
  },
  {
    id: 'hostdime-sections',
    priority: 21,
    test: (f) => /\/components\/modules\/Section[^/]+\//.test(f),
  },
  {
    id: 'hostdime-seo-agent-ready',
    priority: 25,
    test: (f) =>
      /(?:schema|seo|json-ld|metadata|structured-data|open-graph|og-image)/i.test(f),
  },
  {
    id: 'hostdime-lib-layers',
    priority: 30,
    test: (f) => f.includes('/components/lib/'),
  },
  {
    id: 'hostdime-vertical-slice',
    priority: 40,
    test: (f) => f.includes('/components/modules/'),
  },
];

/** @type {SkillRoute[]} */
const STACK_SKILL_ROUTES = [
  { id: 'react', priority: 50, test: (f) => /\.(tsx|jsx)$/i.test(f) },
  { id: 'typescript', priority: 51, test: (f) => /\.(ts|tsx)$/i.test(f) },
  { id: 'eslint', priority: 52, test: (f) => /\.(tsx?|jsx?|mjs|cjs)$/i.test(f) },
  { id: 'testing', priority: 53, test: (f) => /\.(test|spec)\.(tsx?|jsx?)$/i.test(f) },
];

const STACK_HINTS = {
  react:
    'React: hooks corretos, keys em listas, memoização só quando necessário, a11y em controles interativos, evitar estado derivado redundante.',
  typescript:
    'TypeScript: evitar any, narrowing explícito, tipos de props exportados, union discriminada quando aplicável.',
  eslint: 'ESLint: corrigir violations reais; não sugerir desligar regras sem motivo.',
  testing:
    'Testes: RTL user-event, assert comportamento visível, evitar snapshot frágil, cobrir fluxos críticos.',
};

export function matchGlob(glob, filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const pattern = glob.trim();
  if (!pattern || pattern === '**/*' || pattern === '*') return true;

  const regexSource = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');

  return new RegExp(`^${regexSource}$`).test(normalized);
}

/**
 * Casa rótulo de escopo em convencoes.md / exclusions com path relativo do arquivo.
 * @param {string} scopeLabel
 * @param {string} filePath
 */
export function scopeMatchesFile(scopeLabel, filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const scope = scopeLabel.trim();
  if (!scope) return false;

  const parenGlob = scope.match(/\(\*\*\/[^)]+\)/);
  if (parenGlob && matchGlob(parenGlob[0].slice(1, -1), normalized)) {
    return true;
  }

  if (scope === '**/*' || scope === '*') return true;
  if (scope.endsWith('/**')) {
    return normalized.startsWith(scope.slice(0, -3));
  }
  if (matchGlob(scope, normalized)) return true;
  if (normalized === scope || normalized.endsWith(`/${scope}`)) return true;

  return normalized.includes(scope);
}

function stripFrontmatter(content) {
  if (!content.startsWith('---')) return content;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return content;
  return content.slice(end + 4).replace(/^\n/, '');
}

function parseRuleFrontmatter(content) {
  if (!content.startsWith('---')) return { globs: [] };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { globs: [] };

  const fm = content.slice(3, end);
  const globs = [];
  let inGlobs = false;

  for (const line of fm.split('\n')) {
    if (/^globs:\s*$/.test(line)) {
      inGlobs = true;
      continue;
    }
    if (inGlobs) {
      const item = line.match(/^\s*-\s+(.+)$/);
      if (item) {
        globs.push(item[1].trim());
        continue;
      }
      if (/^\S/.test(line)) inGlobs = false;
    }
  }

  return { globs };
}

function readText(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function skillSearchPaths(project, skillId, codeReviewRoot) {
  const home = process.env.HOME || '';
  return [
    path.join(project, '.cursor/skills', skillId, 'SKILL.md'),
    path.join(codeReviewRoot, 'skills', skillId, 'SKILL.md'),
    home ? path.join(home, '.cursor/skills', skillId, 'SKILL.md') : '',
  ].filter(Boolean);
}

function loadSkillContent(project, skillId, codeReviewRoot) {
  for (const candidate of skillSearchPaths(project, skillId, codeReviewRoot)) {
    const raw = readText(candidate);
    if (raw) return { content: stripFrontmatter(raw).trim(), source: candidate };
  }

  if (STACK_HINTS[skillId]) {
    return { content: STACK_HINTS[skillId], source: `stack-hint:${skillId}` };
  }

  return null;
}

export function resolveSkillIds(relFile) {
  const normalized = relFile.replace(/\\/g, '/');
  const matched = [];

  for (const route of HOSTDIME_SKILL_ROUTES) {
    if (route.test(normalized)) matched.push(route);
  }

  for (const route of STACK_SKILL_ROUTES) {
    if (route.test(normalized)) matched.push(route);
  }

  matched.sort((a, b) => a.priority - b.priority);

  const seen = new Set();
  const ids = [];
  for (const route of matched) {
    if (seen.has(route.id)) continue;
    seen.add(route.id);
    ids.push(route.id);
  }

  return ids;
}

export function resolveMatchingRules(project, relFile) {
  const rulesDir = path.join(project, '.cursor/rules');
  if (!fs.existsSync(rulesDir)) return [];

  const normalized = relFile.replace(/\\/g, '/');
  const matched = [];

  for (const entry of fs.readdirSync(rulesDir)) {
    if (!entry.endsWith('.mdc')) continue;
    const abs = path.join(rulesDir, entry);
    const raw = readText(abs);
    const { globs } = parseRuleFrontmatter(raw);
    if (!globs.length) continue;
    if (globs.some((glob) => matchGlob(glob, normalized))) {
      matched.push({
        id: entry.replace(/\.mdc$/, ''),
        path: abs,
        content: stripFrontmatter(raw).trim(),
      });
    }
  }

  matched.sort((a, b) => a.id.localeCompare(b.id));
  return matched;
}

function appendSection(sections, heading, body, maxChars) {
  const chunk = body.trim();
  if (!chunk) return maxChars;
  const block = `${heading}\n\n${chunk}\n`;
  if (sections.total + block.length > maxChars) {
    const remaining = maxChars - sections.total;
    if (remaining < 200) return maxChars;
    sections.parts.push(`${heading}\n\n${chunk.slice(0, remaining - heading.length - 10)}\n…(truncado)\n`);
    sections.total = maxChars;
    return maxChars;
  }
  sections.parts.push(block);
  sections.total += block.length;
  return maxChars;
}

/**
 * @param {string} project — raiz do repo alvo
 * @param {string} relFile — caminho relativo do arquivo
 * @param {{ codeReviewRoot?: string, maxChars?: number, includeStack?: boolean }} [options]
 */
export function resolveContextForFile(project, relFile, options = {}) {
  const codeReviewRoot = options.codeReviewRoot ?? path.join(__dirname, '..');
  const maxChars = options.maxChars ?? Number(process.env.REVIEW_SKILL_MAX_CHARS || DEFAULT_MAX_CHARS);
  const includeStack = options.includeStack ?? process.env.REVIEW_SKILL_STACK !== 'false';

  const sections = { parts: [], total: 0 };
  const skillIds = [];
  const ruleIds = [];

  const inbox = loadSkillContent(project, 'review-inbox', codeReviewRoot);
  if (inbox?.content) {
    appendSection(sections, '### Skill: review-inbox', inbox.content, maxChars);
    skillIds.push('review-inbox');
  }

  for (const id of resolveSkillIds(relFile)) {
    if (!includeStack && STACK_HINTS[id]) continue;
    const loaded = loadSkillContent(project, id, codeReviewRoot);
    if (!loaded?.content) continue;
    appendSection(sections, `### Skill: ${id}`, loaded.content, maxChars);
    skillIds.push(id);
    if (sections.total >= maxChars) break;
  }

  for (const rule of resolveMatchingRules(project, relFile)) {
    ruleIds.push(rule.id);
    appendSection(sections, `### Rule: ${rule.id}`, rule.content, maxChars);
    if (sections.total >= maxChars) break;
  }

  const combined = sections.parts.join('\n').trim();
  return {
    skillIds,
    ruleIds,
    skillsText: combined,
    rulesText: combined,
    contextText: combined,
  };
}
