/**
 * Resolve skills/rules do projeto para /avaliar (CI e LLM).
 * Espelha hostdime-skills-routing + globs de .cursor/rules/*.mdc
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchGlob } from "./match.js";
import {
  HOSTDIME_SKILL_ROUTES,
  STACK_HINTS,
  STACK_SKILL_ROUTES,
} from "./routes.js";

const DEFAULT_MAX_CHARS = 18_000;

const PACKAGE_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export type MatchingRule = {
  id: string;
  path: string;
  content: string;
};

export type FileContext = {
  skillIds: string[];
  ruleIds: string[];
  skillsText: string;
  rulesText: string;
  contextText: string;
};

export type ResolveContextOptions = {
  codeReviewRoot?: string;
  maxChars?: number;
  includeStack?: boolean;
};

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4).replace(/^\n/, "");
}

function parseRuleFrontmatter(content: string): { globs: string[] } {
  if (!content.startsWith("---")) return { globs: [] };
  const end = content.indexOf("\n---", 3);
  if (end === -1) return { globs: [] };

  const fm = content.slice(3, end);
  const globs: string[] = [];
  let inGlobs = false;

  for (const line of fm.split("\n")) {
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

function readText(filePath: string): string {
  if (!filePath || !fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function skillSearchPaths(
  project: string,
  skillId: string,
  codeReviewRoot: string,
): string[] {
  const home = process.env.HOME || "";
  return [
    path.join(project, ".cursor/skills", skillId, "SKILL.md"),
    path.join(codeReviewRoot, "skills", skillId, "SKILL.md"),
    home ? path.join(home, ".cursor/skills", skillId, "SKILL.md") : "",
  ].filter(Boolean);
}

function loadSkillContent(
  project: string,
  skillId: string,
  codeReviewRoot: string,
): { content: string; source: string } | null {
  for (const candidate of skillSearchPaths(project, skillId, codeReviewRoot)) {
    const raw = readText(candidate);
    if (raw) {
      return { content: stripFrontmatter(raw).trim(), source: candidate };
    }
  }

  if (STACK_HINTS[skillId]) {
    return { content: STACK_HINTS[skillId], source: `stack-hint:${skillId}` };
  }

  return null;
}

export function resolveSkillIds(relFile: string): string[] {
  const normalized = relFile.replace(/\\/g, "/");
  const matched = [];

  for (const route of HOSTDIME_SKILL_ROUTES) {
    if (route.test(normalized)) matched.push(route);
  }

  for (const route of STACK_SKILL_ROUTES) {
    if (route.test(normalized)) matched.push(route);
  }

  matched.sort((a, b) => a.priority - b.priority);

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const route of matched) {
    if (seen.has(route.id)) continue;
    seen.add(route.id);
    ids.push(route.id);
  }

  return ids;
}

export function resolveMatchingRules(
  project: string,
  relFile: string,
): MatchingRule[] {
  const rulesDir = path.join(project, ".cursor/rules");
  if (!fs.existsSync(rulesDir)) return [];

  const normalized = relFile.replace(/\\/g, "/");
  const matched: MatchingRule[] = [];

  for (const entry of fs.readdirSync(rulesDir)) {
    if (!entry.endsWith(".mdc")) continue;
    const abs = path.join(rulesDir, entry);
    const raw = readText(abs);
    const { globs } = parseRuleFrontmatter(raw);
    if (!globs.length) continue;
    if (globs.some((glob) => matchGlob(glob, normalized))) {
      matched.push({
        id: entry.replace(/\.mdc$/, ""),
        path: abs,
        content: stripFrontmatter(raw).trim(),
      });
    }
  }

  matched.sort((a, b) => a.id.localeCompare(b.id));
  return matched;
}

type Sections = { parts: string[]; total: number };

function appendSection(
  sections: Sections,
  heading: string,
  body: string,
  maxChars: number,
): number {
  const chunk = body.trim();
  if (!chunk) return maxChars;
  const block = `${heading}\n\n${chunk}\n`;
  if (sections.total + block.length > maxChars) {
    const remaining = maxChars - sections.total;
    if (remaining < 200) return maxChars;
    sections.parts.push(
      `${heading}\n\n${chunk.slice(0, remaining - heading.length - 10)}\n…(truncado)\n`,
    );
    sections.total = maxChars;
    return maxChars;
  }
  sections.parts.push(block);
  sections.total += block.length;
  return maxChars;
}

/**
 * @param project — raiz do repo alvo
 * @param relFile — caminho relativo do arquivo
 */
export function resolveContextForFile(
  project: string,
  relFile: string,
  options: ResolveContextOptions = {},
): FileContext {
  const codeReviewRoot = options.codeReviewRoot ?? PACKAGE_ROOT;
  const maxChars =
    options.maxChars ??
    Number(process.env.REVIEW_SKILL_MAX_CHARS || DEFAULT_MAX_CHARS);
  const includeStack =
    options.includeStack ?? process.env.REVIEW_SKILL_STACK !== "false";

  const sections: Sections = { parts: [], total: 0 };
  const skillIds: string[] = [];
  const ruleIds: string[] = [];

  const inbox = loadSkillContent(project, "review-inbox", codeReviewRoot);
  if (inbox?.content) {
    appendSection(sections, "### Skill: review-inbox", inbox.content, maxChars);
    skillIds.push("review-inbox");
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

  const combined = sections.parts.join("\n").trim();
  return {
    skillIds,
    ruleIds,
    skillsText: combined,
    rulesText: combined,
    contextText: combined,
  };
}
