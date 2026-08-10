/**
 * Serialize / parse de context.yaml (formato hostdime, sem deps YAML).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SCHEMA_VERSION } from "./paths.js";

function escYaml(s: string): string {
  if (/[:{}[\]&*#?|<>=!%@`]/.test(s)) {
    return JSON.stringify(s);
  }
  return s;
}

function dumpList(
  key: string,
  items: Array<Record<string, unknown>>,
  fields: string[]
): string[] {
  const out = ["", `${key}:`];
  if (!items.length) {
    out.push("  []");
    return out;
  }
  for (const item of items) {
    let first = true;
    for (const field of fields) {
      if (
        !(field in item) ||
        item[field] === null ||
        item[field] === "" ||
        (Array.isArray(item[field]) && !(item[field] as unknown[]).length)
      ) {
        continue;
      }
      const val = item[field];
      if (Array.isArray(val)) {
        if (first) {
          out.push(`  - ${field}:`);
          first = false;
        } else {
          out.push(`    ${field}:`);
        }
        for (const entry of val.slice(0, 5)) {
          out.push(`      - ${escYaml(String(entry).slice(0, 120))}`);
        }
      } else if (typeof val === "boolean") {
        const line = `${field}: ${val ? "true" : "false"}`;
        out.push(first ? `  - ${line}` : `    ${line}`);
        first = false;
      } else if (typeof val === "number") {
        const line = `${field}: ${val}`;
        out.push(first ? `  - ${line}` : `    ${line}`);
        first = false;
      } else {
        const line = `${field}: ${escYaml(String(val))}`;
        out.push(first ? `  - ${line}` : `    ${line}`);
        first = false;
      }
    }
  }
  return out;
}

export function dumpYaml(data: Record<string, unknown>): string {
  const lines: string[] = [
    `schema: ${data.schema ?? SCHEMA_VERSION}`,
    `updated_at: ${escYaml(String(data.updated_at ?? ""))}`,
    `source: ${escYaml(String(data.source ?? ""))}`,
    "",
    "exclusions:",
  ];
  const exclusions = (data.exclusions as Array<Record<string, unknown>>) ?? [];
  if (!exclusions.length) {
    lines.push("  []");
  } else {
    for (const ex of exclusions) {
      lines.push(`  - id: ${escYaml(String(ex.id))}`);
      lines.push(`    scope: ${escYaml(String(ex.scope))}`);
      if (ex.skip_categories) {
        lines.push(`    skip_categories: ${JSON.stringify(ex.skip_categories)}`);
      }
      const skipSummaries = ex.skip_summaries as string[] | undefined;
      if (
        skipSummaries?.length &&
        !(
          skipSummaries.length === 1 &&
          skipSummaries[0] === String(ex.reason ?? "").slice(0, 80)
        )
      ) {
        lines.push("    skip_summaries:");
        for (const s of skipSummaries.slice(0, 2)) {
          lines.push(`      - ${escYaml(s.slice(0, 80))}`);
        }
      }
      lines.push(`    decision: ${ex.decision ?? "rejeitado"}`);
      if (ex.reason) {
        lines.push(`    reason: ${escYaml(String(ex.reason).slice(0, 120))}`);
      }
      if (ex.since) lines.push(`    since: ${escYaml(String(ex.since))}`);
      lines.push(`    occurrences: ${ex.occurrences ?? 1}`);
      if (ex.inferred_from) {
        lines.push(`    inferred_from: ${escYaml(String(ex.inferred_from))}`);
      }
    }
  }

  lines.push("");
  lines.push("pending:");
  const pending = (data.pending as Array<Record<string, unknown>>) ?? [];
  if (!pending.length) {
    lines.push("  []");
  } else {
    for (const p of pending) {
      lines.push(`  - id: ${escYaml(String(p.id))}`);
      lines.push(`    scope: ${escYaml(String(p.scope))}`);
      lines.push(`    summary: ${escYaml(String(p.summary))}`);
      lines.push(`    decision: ${p.decision ?? "adiado"}`);
      lines.push(`    since: ${escYaml(String(p.since ?? ""))}`);
      lines.push(`    revisit: ${escYaml(String(p.revisit ?? "next-touch"))}`);
    }
  }

  lines.push(
    ...dumpList(
      "convention_rules",
      (data.convention_rules as Array<Record<string, unknown>>) ?? [],
      ["id", "scope", "rule", "summary", "section"]
    )
  );
  lines.push(
    ...dumpList(
      "candidates",
      (data.candidates as Array<Record<string, unknown>>) ?? [],
      ["id", "scope", "rule", "decision", "occurrences", "promoted", "inferred_from"]
    )
  );

  return `${lines.join("\n")}\n`;
}

function unescYamlScalar(raw: string): unknown {
  const s = raw.trim();
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^\d+$/.test(s) || /^-\d+$/.test(s)) return Number.parseInt(s, 10);
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    try {
      return JSON.parse(s.startsWith("'") ? s.replaceAll("'", '"') : s);
    } catch {
      return s.slice(1, -1);
    }
  }
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  }
  return s;
}

export function parseContextYaml(text: string): Record<string, unknown> {
  const data: Record<string, unknown> = {
    schema: SCHEMA_VERSION,
    updated_at: "",
    source: "",
    exclusions: [] as Array<Record<string, unknown>>,
    pending: [] as Array<Record<string, unknown>>,
    convention_rules: [] as Array<Record<string, unknown>>,
    candidates: [] as Array<Record<string, unknown>>,
  };
  let section: string | null = null;
  let current: Record<string, unknown> | null = null;
  let listKey: string | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;
    if (!rawLine.startsWith(" ") && rawLine.includes(":")) {
      const colon = rawLine.indexOf(":");
      const key = rawLine.slice(0, colon).trim();
      const val = rawLine.slice(colon + 1).trim();
      if (key === "schema" || key === "updated_at" || key === "source") {
        if (current && section) {
          (data[section] as Array<Record<string, unknown>>).push(current);
          current = null;
        }
        section = null;
        listKey = null;
        data[key] =
          key === "schema" && /^\d+$/.test(val)
            ? Number.parseInt(val, 10)
            : unescYamlScalar(val);
        continue;
      }
      if (
        key === "exclusions" ||
        key === "pending" ||
        key === "convention_rules" ||
        key === "candidates"
      ) {
        if (current && section) {
          (data[section] as Array<Record<string, unknown>>).push(current);
        }
        current = null;
        listKey = null;
        section = key;
        if (val === "[]") {
          data[key] = [];
          section = null;
        }
        continue;
      }
    }

    if (section === null) continue;

    if (rawLine.startsWith("  - ")) {
      if (current !== null) {
        (data[section] as Array<Record<string, unknown>>).push(current);
      }
      const body = rawLine.slice(4);
      current = {};
      listKey = null;
      if (body.includes(":")) {
        const c = body.indexOf(":");
        const k = body.slice(0, c).trim();
        const v = body.slice(c + 1).trim();
        if (v === "") {
          listKey = k;
          current[k] = [];
        } else {
          current[k] = unescYamlScalar(v);
        }
      }
      continue;
    }

    if (current === null) continue;

    if (rawLine.startsWith("      - ")) {
      if (listKey) {
        const arr = (current[listKey] as unknown[]) ?? [];
        arr.push(unescYamlScalar(rawLine.slice(8)));
        current[listKey] = arr;
      }
      continue;
    }

    if (rawLine.startsWith("    ") && rawLine.includes(":")) {
      const stripped = rawLine.trim();
      const c = stripped.indexOf(":");
      const k = stripped.slice(0, c).trim();
      const v = stripped.slice(c + 1).trim();
      if (v === "") {
        listKey = k;
        current[k] = [];
      } else {
        listKey = null;
        current[k] = unescYamlScalar(v);
      }
    }
  }

  if (current !== null && section) {
    (data[section] as Array<Record<string, unknown>>).push(current);
  }
  return data;
}

export function writeContext(rd: string, context: Record<string, unknown>): void {
  writeFileSync(path.join(rd, "context.yaml"), dumpYaml(context), "utf8");
}

export function loadContext(rd: string): Record<string, unknown> | null {
  const yamlPath = path.join(rd, "context.yaml");
  if (!existsSync(yamlPath)) return null;
  return parseContextYaml(readFileSync(yamlPath, "utf8"));
}
