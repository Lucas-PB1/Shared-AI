import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reviewWorkDir } from "../memory/paths.js";
import { scopeMatchesFile } from "../skill-routing/index.js";

const PACKAGE_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export function convencoesForFile(project: string, relFile: string): string {
  const rd = reviewWorkDir(project);
  const paths = [
    path.join(rd, "convencoes.md"),
    path.join(rd, "convencoes-store.md"),
  ];
  const bullets: string[] = [];
  for (const convPath of paths) {
    if (!fs.existsSync(convPath)) continue;
    const content = fs.readFileSync(convPath, "utf8");
    let inSection = false;
    for (const line of content.split("\n")) {
      const scopeMatch = line.match(/^## Escopo: (.+)$/);
      if (scopeMatch) {
        inSection = scopeMatchesFile(scopeMatch[1].trim(), relFile);
        continue;
      }
      if (/^## /.test(line)) inSection = false;
      if (inSection && line.startsWith("- ")) bullets.push(line);
    }
  }
  return [...new Set(bullets)].join("\n");
}

export function exclusionsForFile(project: string, relFile: string): string {
  const rd = reviewWorkDir(project);
  const candidates = [
    path.join(rd, "exclusions.yaml"),
    path.join(rd, "context.yaml"),
  ];
  let raw = "";
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      raw = fs.readFileSync(p, "utf8");
      break;
    }
  }
  if (!raw) return "";

  type Item = { scope: string; decision: string; reason: string };
  const items: Item[] = [];
  let current: Item | null = null;
  for (const line of raw.split("\n")) {
    if (/^\s*- (id|scope):/.test(line)) {
      if (current?.reason) items.push(current);
      current = { scope: "**/*", decision: "", reason: "" };
    }
    if (!current) continue;
    const scope = line.match(/^\s*(?:-\s*)?scope:\s*["']?([^"'\n]+)/);
    const decision = line.match(/^\s*(?:-\s*)?decision:\s*(\S+)/);
    const reason = line.match(/^\s*(?:-\s*)?reason:\s*["']?(.+?)["']?\s*$/);
    if (scope) current.scope = scope[1].trim();
    if (decision) current.decision = decision[1];
    if (reason) current.reason = reason[1].trim();
  }
  if (current?.reason) items.push(current);

  return items
    .filter((item) => /rejeitado|nao-aplicavel/.test(item.decision))
    .filter((item) => scopeMatchesFile(item.scope, relFile))
    .map((item) => `- [${item.decision}] ${item.reason}`)
    .join("\n");
}

export function loadSystemPrompt(packageRoot = PACKAGE_ROOT): string {
  const templatePath = path.join(packageRoot, "templates/avaliar-llm-system.md");
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, "utf8");
  }
  return "You are a code reviewer. Output /avaliar format markdown only.";
}

export type UserPromptInput = {
  relFile: string;
  stack: string;
  source: string;
  diff: string;
  staticOut: string;
  convencoes: string;
  exclusions: string;
  skillsContext: string;
  skillIds?: string[];
  ruleIds?: string[];
};

export function buildUserPrompt({
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
}: UserPromptInput): string {
  const routingMeta = [
    skillIds?.length
      ? `Skills: ${skillIds.join(", ")}`
      : "Skills: (none matched)",
    ruleIds?.length ? `Rules: ${ruleIds.join(", ")}` : "Rules: (none matched)",
  ].join("\n");

  return [
    `File: ${relFile}`,
    `Stack: ${stack}`,
    routingMeta,
    "",
    "--- PROJECT SKILLS & RULES (apply architecture/conventions) ---",
    skillsContext || "(no project skills or rules for this path)",
    "",
    "--- SOURCE (full file) ---",
    source,
    "",
    "--- DIFF (hunks in this PR) ---",
    diff || "(no diff hunks — file may be new)",
    "",
    "--- STATIC ANALYSIS (filter; do not paste raw) ---",
    staticOut || "(no static findings)",
    "",
    "--- CONVENÇÕES (apply when relevant) ---",
    convencoes || "(none for this scope)",
    "",
    "--- EXCLUSIONS (never suggest these again) ---",
    exclusions || "(none)",
    "",
    "Produce the /avaliar markdown report now.",
  ].join("\n");
}

/** Veredito textual do relatório /avaliar (linha **Veredito:**). */
export function parseVerdict(report: string): string {
  const match = report.match(/^\*\*Veredito:\*\*\s*(.+)$/m);
  if (!match) return "Ajustes necessários";
  const v = match[1].trim();
  if (/^OK$/i.test(v)) return "OK";
  if (/n[aã]o recomendado/i.test(v)) return "Não recomendado";
  return "Ajustes necessários";
}
