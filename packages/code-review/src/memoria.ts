/**
 * Memória de review — context.yaml, decisions.jsonl, convencoes.md.
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
import {
  DECISIONS_INGEST_FILE,
  mergeHistoryIntoContext,
  mergePromotedIntoConvencoes,
  type DecisionLike,
} from "./memoria-core.js";
import { stableFindingId } from "./finding-ids.js";

export const SCHEMA_VERSION = 1;

export { DECISIONS_INGEST_FILE };

function utcNowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function localStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function reviewDir(project: string): string {
  return path.join(project, ".cursor", "review");
}

export function decisionsIngestPath(project: string): string {
  return path.join(reviewDir(project), DECISIONS_INGEST_FILE);
}

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
      if (!(field in item) || item[field] === null || item[field] === "" || (Array.isArray(item[field]) && !(item[field] as unknown[]).length)) {
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
      if (ex.reason) lines.push(`    reason: ${escYaml(String(ex.reason).slice(0, 120))}`);
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
  if (/^\d+$/.test(s) || (/^-\d+$/.test(s))) return Number.parseInt(s, 10);
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

export function fileStats(project: string): Record<string, { bytes: number; lines: number } | null> {
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
      stats[name] = { bytes: statSync(p).size, lines: text.split(/\r?\n/).length };
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

export function cmdStatus(project: string): number {
  const rd = reviewDir(project);
  const m = mode(project);
  const stats = fileStats(project);
  console.log(`Modo: ${m === "v2" ? "v2" : "não inicializado"}`);
  console.log(`Projeto: ${project}`);
  console.log("");
  console.log("Arquivos:");
  for (const [name, info] of Object.entries(stats)) {
    if (info) {
      console.log(
        `  ${name.padEnd(22)} ${String(info.bytes).padStart(6)} bytes  ${String(info.lines).padStart(4)} linhas`
      );
    } else {
      console.log(`  ${name.padEnd(22)} —`);
    }
  }
  if (m !== "v2") {
    console.log("\nRode: npm run memoria -- init --write <projeto>");
    return 0;
  }
  const dec = readMergedDecisions(project);
  const ctx = path.join(rd, "context.yaml");
  console.log("");
  console.log(`decisões: ${dec.length}`);
  console.log(`context.yaml: ${existsSync(ctx) ? "sim" : "não — rode compactar"}`);
  return 0;
}

/** Inicializa scaffold de memória. Alias: migrar. */
export function cmdInit(project: string, write: boolean): number {
  console.log("=== init (memória) ===");
  if (!write) {
    console.log("Dry-run. Use --write para criar scaffold.");
    return 0;
  }
  ensureV2Scaffold(project);
  console.log("Scaffold OK");
  return 0;
}

export const cmdMigrar = cmdInit;

const BACKUP_FILES = [
  "decisions.jsonl",
  "decisions-ingest.jsonl",
  "context.yaml",
  "convencoes.md",
  ".memoria-version",
] as const;

export function cmdBackup(project: string): number {
  const rd = reviewDir(project);
  if (mode(project) !== "v2") {
    console.error("Erro: memória v2 não inicializada (npm run memoria -- init --write)");
    return 1;
  }
  const destDir = path.join(rd, "backups", `v2-${localStamp()}`);
  mkdirSync(destDir, { recursive: true });
  let n = 0;
  for (const name of BACKUP_FILES) {
    const src = path.join(rd, name);
    if (!existsSync(src)) continue;
    copyFileSync(src, path.join(destDir, name));
    n += 1;
  }
  if (!n) {
    console.error("Erro: nenhum arquivo v2 para backup");
    return 1;
  }
  const latest = path.join(rd, "backups", "latest");
  mkdirSync(latest, { recursive: true });
  for (const name of BACKUP_FILES) {
    const src = path.join(destDir, name);
    if (existsSync(src)) copyFileSync(src, path.join(latest, name));
  }
  console.log(`Backup: ${destDir} (${n} arquivo(s))`);
  return 0;
}

export function cmdRestore(project: string, write: boolean): number {
  const rd = reviewDir(project);
  const srcDir = path.join(rd, "backups", "latest");
  if (
    !existsSync(path.join(srcDir, "context.yaml")) &&
    !existsSync(path.join(srcDir, "decisions.jsonl"))
  ) {
    console.error("Erro: backup v2 em backups/latest não encontrado (rode backup antes)");
    return 1;
  }
  console.log("=== restore v2 ===");
  console.log(`Fonte: ${srcDir}`);
  if (!write) {
    console.log("Dry-run. Use --write para restaurar.");
    return 0;
  }
  mkdirSync(rd, { recursive: true });
  for (const name of BACKUP_FILES) {
    const src = path.join(srcDir, name);
    if (existsSync(src)) copyFileSync(src, path.join(rd, name));
  }
  console.log("Restaurado a partir de backups/latest");
  return 0;
}

export function cmdDiff(project: string): number {
  ensureV2Scaffold(project);
  const rd = reviewDir(project);
  const decisions = readMergedDecisions(project);
  const context = buildContext(project, "diff", decisions);
  console.log("=== status compacto ===");
  console.log(`decisões: ${decisions.length}`);
  console.log(`exclusions: ${(context.exclusions as unknown[]).length}`);
  console.log(`pending: ${(context.pending as unknown[]).length}`);
  console.log(`candidates: ${(context.candidates as unknown[]).length}`);
  const ctxPath = path.join(rd, "context.yaml");
  if (existsSync(ctxPath)) {
    console.log(`context.yaml: ${statSync(ctxPath).size} bytes`);
  }
  return 0;
}

export function cmdCompactar(project: string, write: boolean): number {
  ensureV2Scaffold(project);
  const rd = reviewDir(project);
  const decisions = readMergedDecisions(project);
  if (!decisions.length) {
    console.error("Erro: nenhuma decisão em decisions.jsonl ou decisions-ingest.jsonl");
    return 1;
  }
  const context = buildContext(project, "decisions.jsonl", decisions);
  console.log("=== compactar (proposta) ===");
  console.log(`Exclusions: ${(context.exclusions as unknown[]).length}`);
  console.log(`Pending:    ${(context.pending as unknown[]).length}`);
  console.log(`Candidates: ${(context.candidates as unknown[]).length}`);
  if (!write) {
    console.log("\nDry-run. Use --write para gravar context.yaml.");
    return 0;
  }
  writeContext(rd, context);
  console.log(`\nGravado: ${path.join(rd, "context.yaml")}`);
  return 0;
}

export function cmdPromover(
  project: string,
  write: boolean,
  allCandidates: boolean
): number {
  ensureV2Scaffold(project);
  const rd = reviewDir(project);
  let context = loadContext(rd);
  if (context === null) {
    const decisions = readMergedDecisions(project);
    if (decisions.length) {
      context = buildContext(project, "promover", decisions);
      if (write) writeContext(rd, context);
    } else {
      console.error("Erro: context.yaml ausente — rode compactar");
      return 1;
    }
  } else if (write) {
    writeContext(rd, context);
  }

  let sections: Record<string, string[]> = {};

  for (const r of (context.convention_rules as Array<Record<string, unknown>>) ?? []) {
    const scope = String(r.scope ?? "**/*");
    const rule = String("rule" in r ? r.rule : r.summary ?? "");
    sections[scope] = sections[scope] ?? [];
    sections[scope].push(rule);
  }

  for (const c of (context.candidates as Array<Record<string, unknown>>) ?? []) {
    if (!allCandidates && Number(c.occurrences ?? 1) < 2) continue;
    if (c.promoted) continue;
    const scope = String(c.scope ?? "**/*");
    sections[scope] = sections[scope] ?? [];
    sections[scope].push(String(c.rule));
  }

  sections = Object.fromEntries(
    Object.entries(sections)
      .map(([k, v]) => [k, v.filter(Boolean)] as const)
      .filter(([, v]) => v.length)
  );

  if (!Object.keys(sections).length) {
    console.log("Nenhuma regra para promover.");
    return 0;
  }

  const out = path.join(rd, "convencoes.md");
  const existing = existsSync(out) ? readFileSync(out, "utf8") : "";
  const [merged, added] = mergePromotedIntoConvencoes(existing, sections);

  console.log("=== promover (proposta) ===");
  console.log(`Escopos: ${Object.keys(sections).length}`);
  console.log(`Bullets novos: ${added}`);
  console.log(`Tamanho: ${merged.length} bytes`);

  if (!write) {
    console.log("\nDry-run. Use --write para gravar convencoes.md.");
    return 0;
  }
  if (added === 0) {
    console.log("\nNenhum bullet novo em convencoes.md (já presentes ou abaixo do limiar).");
    return 0;
  }
  writeFileSync(out, merged, "utf8");
  console.log(`\nGravado: ${out} (+${added} bullet(s))`);
  return 0;
}

export function cmdFindingId(text: string, stdin?: string): number {
  let payload = text.trim();
  if (!payload) payload = (stdin ?? "").trim();
  if (!payload) {
    console.error("Erro: informe título ou summary do achado (arg ou stdin)");
    return 1;
  }
  console.log(stableFindingId(payload));
  return 0;
}
