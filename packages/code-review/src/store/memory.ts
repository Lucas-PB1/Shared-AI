/**
 * Memória no store (U3): exclusions + conventions.
 * Arquivo git = cache exportável; store = fonte multi-repo.
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { scopeMatchesFile } from "../skill-routing/index.js";
import { reviewDir } from "../memory/paths.js";
import type { LoadConfigOpts } from "./config.js";
import type { ReviewStorePort } from "./port.js";
import { openStore } from "./dual-write.js";

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

function rowToExclusion(row: Record<string, unknown>): StoreExclusion {
  return {
    findingKey: String(row.finding_key ?? "").trim(),
    reason: String(row.reason ?? "").trim(),
    scopeGlob: String(row.scope_glob ?? "**/*").trim() || "**/*",
    active: row.active !== false,
  };
}

function rowToConvention(row: Record<string, unknown>): StoreConvention {
  return {
    scopeGlob: String(row.scope_glob ?? "**/*").trim() || "**/*",
    body: String(row.body ?? "").trim(),
    source: row.source != null ? String(row.source) : null,
  };
}

export async function fetchStoreMemory(
  opts: {
    port?: ReviewStorePort | null;
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    projectSlug?: string;
  } = {}
): Promise<{
  attempted: boolean;
  exclusions: StoreExclusion[];
  conventions: StoreConvention[];
  projectId?: string;
  error?: string;
}> {
  const port =
    opts.port === undefined
      ? openStore({ env: opts.env, projectSlug: opts.projectSlug })
      : opts.port;
  if (!port) {
    return { attempted: false, exclusions: [], conventions: [] };
  }
  try {
    const projectId = await port.getProjectId(opts.projectSlug);
    const [exRows, convRows] = await Promise.all([
      port.listExclusions(projectId, { activeOnly: true }),
      port.listConventions(projectId),
    ]);
    return {
      attempted: true,
      projectId,
      exclusions: exRows.map(rowToExclusion).filter((e) => e.findingKey),
      conventions: convRows.map(rowToConvention).filter((c) => c.body),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      attempted: true,
      exclusions: [],
      conventions: [],
      error: msg,
    };
  }
}

/**
 * Grava cache local: exclusions.yaml + convencoes-store.md (não sobrescreve convencoes.md).
 */
export async function pullMemoryToProject(
  project: string,
  opts: LoadConfigOpts & { projectSlug?: string; port?: ReviewStorePort | null } = {}
): Promise<{
  attempted: boolean;
  exclusionsPath?: string;
  conventionsPath?: string;
  exclusionCount: number;
  conventionCount: number;
  error?: string;
}> {
  const mem = await fetchStoreMemory({
    port: opts.port,
    env: opts.env,
    projectSlug: opts.projectSlug,
  });
  if (!mem.attempted) {
    return {
      attempted: false,
      exclusionCount: 0,
      conventionCount: 0,
    };
  }
  if (mem.error) {
    return {
      attempted: true,
      exclusionCount: 0,
      conventionCount: 0,
      error: mem.error,
    };
  }

  const rd = reviewDir(project);
  mkdirSync(rd, { recursive: true });
  const exclusionsPath = path.join(rd, "exclusions.yaml");
  const conventionsPath = path.join(rd, "convencoes-store.md");
  writeFileSync(
    exclusionsPath,
    formatExclusionsYaml(mem.exclusions),
    "utf8"
  );
  writeFileSync(conventionsPath, formatConventionsMd(mem.conventions), "utf8");
  return {
    attempted: true,
    exclusionsPath,
    conventionsPath,
    exclusionCount: mem.exclusions.filter((e) => e.active).length,
    conventionCount: mem.conventions.length,
  };
}

/**
 * Envia exclusions slim locais (yaml export) para o store.
 */
export async function pushExclusionsFromProject(
  project: string,
  opts: {
    port?: ReviewStorePort | null;
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    projectSlug?: string;
    yamlPath?: string;
  } = {}
): Promise<{
  attempted: boolean;
  written: number;
  error?: string;
}> {
  const port =
    opts.port === undefined
      ? openStore({ env: opts.env, projectSlug: opts.projectSlug })
      : opts.port;
  if (!port) {
    return { attempted: false, written: 0 };
  }

  const yamlPath =
    opts.yamlPath ?? path.join(reviewDir(project), "exclusions.yaml");
  if (!existsSync(yamlPath)) {
    return {
      attempted: true,
      written: 0,
      error: `arquivo ausente: ${yamlPath}`,
    };
  }

  const items = parseExclusionsYaml(readFileSync(yamlPath, "utf8"));
  try {
    const projectId = await port.getProjectId(opts.projectSlug);
    let written = 0;
    for (const item of items) {
      const key =
        item.id ||
        item.reason
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/[-\s]+/g, "-")
          .slice(0, 80) ||
        "exclusion";
      await port.upsertExclusion(projectId, {
        findingKey: key,
        reason: item.reason,
        scopeGlob: item.scope,
        active: true,
      });
      written += 1;
    }
    return { attempted: true, written };
  } catch (err) {
    return {
      attempted: true,
      written: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export type ParsedExclusionYaml = {
  scope: string;
  decision: string;
  reason: string;
  id: string;
};

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

/** Textos store para um path (convencoes + exclusions) — soft se offline. */
export async function storeMemoryForFile(
  relFile: string,
  opts: {
    port?: ReviewStorePort | null;
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    projectSlug?: string;
  } = {}
): Promise<{ conventions: string; exclusions: string }> {
  const mem = await fetchStoreMemory(opts);
  if (!mem.attempted || mem.error) {
    return { conventions: "", exclusions: "" };
  }

  const convBullets = mem.conventions
    .filter((c) => scopeMatchesFile(c.scopeGlob, relFile))
    .map((c) => {
      const body = c.body.trim();
      return body.startsWith("- ") ? body : `- ${body}`;
    });

  const exclBullets = mem.exclusions
    .filter((e) => e.active && scopeMatchesFile(e.scopeGlob, relFile))
    .map(
      (e) =>
        `- [rejeitado] ${e.reason || e.findingKey}${
          e.findingKey ? ` (${e.findingKey})` : ""
        }`
    );

  return {
    conventions: convBullets.join("\n"),
    exclusions: exclBullets.join("\n"),
  };
}

export function mergeTextLayers(fileLayer: string, storeLayer: string): string {
  const a = fileLayer.trim();
  const b = storeLayer.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a}\n${b}`;
}
