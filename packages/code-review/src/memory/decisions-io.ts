/**
 * I/O de decisions.jsonl + scaffold e build de context.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { writeContext } from "./context-yaml.js";
import {
  mergeHistoryIntoContext,
  type DecisionLike,
} from "./merge.js";
import {
  DECISIONS_INGEST_FILE,
  SCHEMA_VERSION,
  decisionsIngestPath,
  reviewDir,
  utcNowIso,
} from "./paths.js";

export function writeDecisions(
  filePath: string,
  decisions: Array<Record<string, unknown>>
): void {
  const body = decisions.map((d) => JSON.stringify(d)).join("\n");
  writeFileSync(filePath, body ? `${body}\n` : "", "utf8");
}

export function readDecisions(filePath: string): Array<Record<string, unknown>> {
  if (!existsSync(filePath)) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    out.push(JSON.parse(trimmed) as Record<string, unknown>);
  }
  return out;
}

export function readMergedDecisions(project: string): Array<Record<string, unknown>> {
  const rd = reviewDir(project);
  const merged = readDecisions(decisionsIngestPath(project));
  const seen = new Set(
    merged.map((d) => `${d.source ?? ""}${d.finding_id ?? ""}`)
  );
  for (const item of readDecisions(path.join(rd, "decisions.jsonl"))) {
    const key = `${item.source ?? ""}${item.finding_id ?? ""}`;
    if (!seen.has(key)) {
      merged.push(item);
      seen.add(key);
    }
  }
  return merged;
}

export function buildContext(
  project: string,
  source: string,
  decisions?: DecisionLike[] | Array<Record<string, unknown>> | null
): Record<string, unknown> {
  let dec =
    decisions ??
    readDecisions(path.join(reviewDir(project), "decisions.jsonl"));
  if (!dec.length) {
    dec = readMergedDecisions(project);
  }
  const [exclusions, pending, candidates] = mergeHistoryIntoContext(
    dec as DecisionLike[],
    [],
    []
  );
  return {
    schema: SCHEMA_VERSION,
    updated_at: utcNowIso(),
    source,
    exclusions,
    pending,
    convention_rules: [],
    candidates,
  };
}

export function mode(project: string): string {
  const versionFile = path.join(reviewDir(project), ".memoria-version");
  if (existsSync(versionFile) && readFileSync(versionFile, "utf8").trim() === "2") {
    return "v2";
  }
  return "uninit";
}

export function fileStats(
  project: string
): Record<string, { bytes: number; lines: number } | null> {
  const rd = reviewDir(project);
  const files: Record<string, string> = {
    "decisions.jsonl": path.join(rd, "decisions.jsonl"),
    "decisions-ingest.jsonl": path.join(rd, DECISIONS_INGEST_FILE),
    "context.yaml": path.join(rd, "context.yaml"),
    "convencoes.md": path.join(rd, "convencoes.md"),
    ".memoria-version": path.join(rd, ".memoria-version"),
  };
  const stats: Record<string, { bytes: number; lines: number } | null> = {};
  for (const [name, p] of Object.entries(files)) {
    if (existsSync(p)) {
      const text = readFileSync(p, "utf8");
      stats[name] = {
        bytes: statSync(p).size,
        lines: text.split(/\r?\n/).length,
      };
    } else {
      stats[name] = null;
    }
  }
  return stats;
}

export function ensureV2Scaffold(project: string): void {
  const rd = reviewDir(project);
  mkdirSync(rd, { recursive: true });
  writeFileSync(path.join(rd, ".memoria-version"), "2\n", "utf8");
  const decisions = path.join(rd, "decisions.jsonl");
  if (!existsSync(decisions)) writeFileSync(decisions, "", "utf8");
  const ctx = path.join(rd, "context.yaml");
  if (!existsSync(ctx)) {
    writeContext(rd, {
      schema: SCHEMA_VERSION,
      updated_at: utcNowIso(),
      source: "ensure-v2",
      exclusions: [],
      pending: [],
      convention_rules: [],
      candidates: [],
    });
  }
  const conv = path.join(rd, "convencoes.md");
  if (!existsSync(conv)) {
    const root = process.env.HOSTDIME_IA_ROOT ?? "";
    const tpl = root
      ? path.join(root, "packages/code-review/templates/convencoes.md")
      : "";
    if (tpl && existsSync(tpl)) {
      copyFileSync(tpl, conv);
    } else {
      writeFileSync(
        conv,
        "# Convenções locais (gitignored)\n\n## Escopo global\n\n_(vazio)_\n",
        "utf8"
      );
    }
  }
}
