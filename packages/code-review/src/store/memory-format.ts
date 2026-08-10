/**
 * Formato de export de memória store (yaml/md slim).
 */

export type StoreExclusion = {
  findingKey: string;
  reason: string;
  scopeGlob: string;
  active: boolean;
};

export type StoreConvention = {
  scopeGlob: string;
  body: string;
  source: string | null;
};

export type ParsedExclusionYaml = {
  scope: string;
  decision: string;
  reason: string;
  id: string;
};

function yamlEscape(s: string): string {
  if (/[:{}[\]&*#?|<>=!%@`]/.test(s) || s.includes("\n")) {
    return JSON.stringify(s);
  }
  return s;
}

export function formatExclusionsYaml(
  items: StoreExclusion[],
  header = "# Exclusões slim (finding_key + reason + scope) — sem snippets"
): string {
  const lines = [
    header,
    "# Gerado por review-memory-pull / export do store (U3).",
    "",
    "exclusions:",
  ];
  if (!items.length) {
    lines.push("  []");
  } else {
    for (const e of items) {
      if (!e.active) continue;
      lines.push(`  - scope: ${yamlEscape(e.scopeGlob)}`);
      lines.push(`    decision: rejeitado`);
      lines.push(`    reason: ${yamlEscape(e.reason || e.findingKey)}`);
      lines.push(`    id: ${yamlEscape(e.findingKey)}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function formatConventionsMd(items: StoreConvention[]): string {
  const byScope = new Map<string, string[]>();
  for (const c of items) {
    const scope = c.scopeGlob || "**/*";
    const body = c.body.trim();
    if (!body) continue;
    const list = byScope.get(scope) ?? [];
    const bullet = body.startsWith("- ") ? body : `- ${body}`;
    if (!list.includes(bullet)) list.push(bullet);
    byScope.set(scope, list);
  }
  const lines = [
    "# Convenções (cache do store)",
    "# Gerado por review-memory-pull — edite o store ou re-promova de decisions locais.",
    "",
  ];
  for (const scope of [...byScope.keys()].sort()) {
    lines.push(`## Escopo: ${scope}`);
    lines.push("");
    for (const b of byScope.get(scope) ?? []) lines.push(b);
    lines.push("");
  }
  return lines.join("\n");
}

export function parseExclusionsYaml(raw: string): ParsedExclusionYaml[] {
  const items: ParsedExclusionYaml[] = [];
  let current: ParsedExclusionYaml | null = null;
  for (const line of raw.split("\n")) {
    if (/^\s*- (id|scope):/.test(line)) {
      if (current?.reason) items.push(current);
      current = { scope: "**/*", decision: "", reason: "", id: "" };
    }
    if (!current) continue;
    const scope = line.match(/^\s*(?:-\s*)?scope:\s*["']?([^"'\n]+)/);
    const decision = line.match(/^\s*(?:-\s*)?decision:\s*(\S+)/);
    const reason = line.match(/^\s*(?:-\s*)?reason:\s*["']?(.+?)["']?\s*$/);
    const id = line.match(/^\s*(?:-\s*)?id:\s*["']?([^"'\n]+)/);
    if (scope) current.scope = scope[1].trim();
    if (decision) current.decision = decision[1];
    if (reason) current.reason = reason[1].trim();
    if (id) current.id = id[1].trim();
  }
  if (current?.reason) items.push(current);
  return items.filter((i) => /rejeitado|nao-aplicavel/.test(i.decision));
}

export function rowToExclusion(row: Record<string, unknown>): StoreExclusion {
  return {
    findingKey: String(row.finding_key ?? "").trim(),
    reason: String(row.reason ?? "").trim(),
    scopeGlob: String(row.scope_glob ?? "**/*").trim() || "**/*",
    active: row.active !== false,
  };
}

export function rowToConvention(row: Record<string, unknown>): StoreConvention {
  return {
    scopeGlob: String(row.scope_glob ?? "**/*").trim() || "**/*",
    body: String(row.body ?? "").trim(),
    source: row.source != null ? String(row.source) : null,
  };
}

export function mergeTextLayers(fileLayer: string, storeLayer: string): string {
  const a = fileLayer.trim();
  const b = storeLayer.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a}\n${b}`;
}
