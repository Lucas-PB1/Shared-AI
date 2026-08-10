/**
 * Lógica pura da memória de review (escopos, convenções, merge de decisões).
 */

import path from "node:path";

export const DECISIONS_INGEST_FILE = "decisions-ingest.jsonl";
export const CONVENCOES_SCOPE = /^##\s+Escopo:\s+(.+)$/;

export const SCOPE_MAP: Record<string, string> = {
  "simulator-core": "**/simulator-core/**",
  HdbrDedicatedSimulator: "**/HdbrDedicatedSimulator/**",
  QuoteModal: "**/HdbrDedicatedSimulator/**/QuoteModal*",
};

export type DecisionLike = Record<string, unknown> & {
  finding_id: string;
  decision: string;
  file?: string;
  review_slug?: string;
  line?: string | number;
  summary: string;
  reason?: string | null;
  finalized_at: string;
  source?: string;
};

export type ConvencoesSection = {
  header: string;
  label: string;
  glob: string;
  bullets: string[];
};

export function decisionStoreLabel(decision: { source?: string }): string {
  const source = String(decision.source ?? "");
  if (source.startsWith("github-pr-")) return DECISIONS_INGEST_FILE;
  return "decisions.jsonl";
}

export function inferScopeFromFile(filePath: string): string {
  if (!filePath) return "**/*";
  const normalized = filePath.replace(/\\/g, "/");
  for (const [key, pattern] of Object.entries(SCOPE_MAP)) {
    if (normalized.includes(key)) return pattern;
  }
  const parent = path.posix.dirname(normalized);
  if (parent && parent !== ".") return `${parent}/**`;
  return "**/*";
}

export function inferScopeFromSection(title: string): string {
  const titleLower = title.toLowerCase();
  for (const [key, pattern] of Object.entries(SCOPE_MAP)) {
    if (titleLower.includes(key.toLowerCase())) return pattern;
  }
  return "**/*";
}

/** Shell-style fnmatch (Python) — * and ? match any string/char including /. */
function fnmatch(name: string, pattern: string): boolean {
  let re = "^";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") re += ".*";
    else if (c === "?") re += ".";
    else if ("\\.[]{}()+-^$|".includes(c)) re += `\\${c}`;
    else re += c;
  }
  re += "$";
  return new RegExp(re).test(name);
}

export function globMatchesFile(globPattern: string, filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const pattern = globPattern.trim();
  if (!pattern) return false;
  if (pattern === "**/*" || pattern === "*") return true;
  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3).replace(/\/+$/, "");
    return normalized.startsWith(`${prefix}/`) || normalized === prefix;
  }
  return fnmatch(normalized, pattern);
}

export function extractScopeGlob(scopeLabel: string): string {
  const label = scopeLabel.trim();
  const paren = /\(\*\*\/[^)]+\)/.exec(label);
  if (paren) return paren[0].slice(1, -1);
  if (label.startsWith("**/")) return label;
  return label;
}

export function parseConvencoesSections(
  content: string
): [string, ConvencoesSection[]] {
  const preambleLines: string[] = [];
  const sections: ConvencoesSection[] = [];
  let current: ConvencoesSection | null = null;

  for (const line of content.split(/\r?\n/)) {
    const scopeMatch = CONVENCOES_SCOPE.exec(line.trim());
    if (scopeMatch) {
      if (current !== null) sections.push(current);
      const label = scopeMatch[1].trim();
      current = {
        header: line.replace(/\s+$/, ""),
        label,
        glob: extractScopeGlob(label),
        bullets: [],
      };
      continue;
    }
    if (current === null) {
      preambleLines.push(line);
      continue;
    }
    const stripped = line.trim();
    if (stripped.startsWith("- ")) {
      current.bullets.push(stripped.slice(2).trim());
    }
  }
  if (current !== null) sections.push(current);
  return [preambleLines.join("\n").replace(/\s+$/, ""), sections];
}

export function renderConvencoesSections(
  preamble: string,
  sections: ConvencoesSection[]
): string {
  const lines: string[] = [];
  if (preamble.trim()) {
    lines.push(preamble.replace(/\s+$/, ""));
    lines.push("");
  }
  for (const section of sections) {
    lines.push(section.header);
    lines.push("");
    if (section.bullets.length) {
      for (const bullet of section.bullets) lines.push(`- ${bullet}`);
    } else {
      lines.push("_(vazio)_");
    }
    lines.push("");
  }
  return `${lines.join("\n").replace(/\s+$/, "")}\n`;
}

export function findConvencoesSectionIndex(
  sections: ConvencoesSection[],
  scope: string
): number | null {
  const scopeNorm = scope.replace(/\\/g, "/");

  function scopeTokens(value: string): Set<string> {
    const tokens = value.match(/[\w-]+/g) ?? [];
    return new Set(tokens.filter((t) => t.length > 3));
  }

  const scopeSet = scopeTokens(scopeNorm);
  let bestIdx: number | null = null;
  let bestScore = 0;

  for (let idx = 0; idx < sections.length; idx++) {
    const section = sections[idx];
    const sectionGlob =
      section.glob || extractScopeGlob(section.label ?? "");
    if (scopeNorm === sectionGlob) return idx;
    const sectionSet = new Set([
      ...scopeTokens(sectionGlob),
      ...scopeTokens(section.label ?? ""),
    ]);
    let overlap = 0;
    for (const t of scopeSet) if (sectionSet.has(t)) overlap++;
    if (overlap > bestScore) {
      bestScore = overlap;
      bestIdx = idx;
    }
  }
  return bestScore > 0 ? bestIdx : null;
}

export function mergePromotedIntoConvencoes(
  existing: string,
  newByScope: Record<string, string[]>
): [string, number] {
  const [preamble, sections] = parseConvencoesSections(existing);
  const known = new Set(
    sections.flatMap((s) => s.bullets.map((b) => b.trim()))
  );
  let added = 0;

  for (const [scope, rules] of Object.entries(newByScope)) {
    for (const rule of rules) {
      const text = rule.trim();
      if (!text || known.has(text)) continue;
      const idx = findConvencoesSectionIndex(sections, scope);
      if (idx === null) {
        sections.push({
          header: `## Escopo: ${scope}`,
          label: scope,
          glob: scope,
          bullets: [text],
        });
      } else {
        sections[idx].bullets.push(text);
      }
      known.add(text);
      added += 1;
    }
  }
  return [renderConvencoesSections(preamble, sections), added];
}

export function mergeHistoryIntoContext(
  decisions: DecisionLike[],
  exclusions: Array<Record<string, unknown>>,
  candidates: Array<Record<string, unknown>>
): [
  Array<Record<string, unknown>>,
  Array<Record<string, unknown>>,
  Array<Record<string, unknown>>,
] {
  const exclById = new Map<string, Record<string, unknown>>(
    exclusions.map((e) => [String(e.id), { ...e }])
  );
  const candById = new Map<string, Record<string, unknown>>(
    candidates.map((c) => [String(c.id), { ...c }])
  );
  const pending: Array<Record<string, unknown>> = [];

  for (const d of decisions) {
    const fid = d.finding_id;
    const scope = inferScopeFromFile(String(d.file ?? ""));
    const decision = d.decision;
    const sourceRef = `${d.file || d.review_slug}:${d.line}`;

    if (decision === "rejeitado" || decision === "nao-aplicavel") {
      if (exclById.has(fid)) {
        const ex = exclById.get(fid)!;
        ex.occurrences = Number(ex.occurrences ?? 1) + 1;
        const sources = Array.isArray(ex.sources) ? ex.sources : [];
        sources.push(sourceRef);
        ex.sources = sources;
      } else {
        exclById.set(fid, {
          id: fid,
          scope,
          skip_summaries: [String(d.summary).slice(0, 120)],
          decision,
          reason: d.reason || d.summary,
          since: String(d.finalized_at).slice(0, 10),
          occurrences: 1,
          sources: [sourceRef],
          inferred_from: decisionStoreLabel(d),
        });
      }
    } else if (decision === "adiado") {
      pending.push({
        id: fid,
        scope,
        summary: d.summary,
        decision: "adiado",
        since: String(d.finalized_at).slice(0, 10),
        revisit: "next-touch",
      });
    } else if (decision === "aceito") {
      let rule = d.summary;
      const reason = String(d.reason ?? "").trim();
      const prefixes = [
        "suggestion / Para",
        "código De removido",
        "indicador `",
        "thread resolvido",
        "merge sem resposta",
      ];
      if (reason && !prefixes.some((p) => reason.startsWith(p))) {
        rule = `${d.summary} — ${reason.slice(0, 100)}`;
      }
      if (candById.has(fid)) {
        const c = candById.get(fid)!;
        c.occurrences = Number(c.occurrences ?? 1) + 1;
      } else {
        candById.set(fid, {
          id: fid,
          scope,
          rule,
          decision: "aceito",
          occurrences: 1,
          promoted: false,
          inferred_from: decisionStoreLabel(d),
        });
      }
    }
  }

  return [
    [...exclById.values()],
    pending,
    [...candById.values()],
  ];
}
