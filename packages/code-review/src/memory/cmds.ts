/**
 * Comandos CLI da fatia memory (`review-memoria` / npm run memoria).
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
import { stableFindingId } from "../shared/index.js";
import { loadContext, writeContext } from "./context-yaml.js";
import {
  buildContext,
  ensureV2Scaffold,
  fileStats,
  mode,
  readMergedDecisions,
} from "./decisions-io.js";
import { mergePromotedIntoConvencoes } from "./merge.js";
import { localStamp, reviewWorkDir } from "./paths.js";

export function cmdStatus(project: string): number {
  const rd = reviewWorkDir(project);
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
  const rd = reviewWorkDir(project);
  if (mode(project) !== "v2") {
    console.error(
      "Erro: memória não inicializada (npm run memoria -- init --write)"
    );
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
    console.error("Erro: nenhum arquivo de memória para backup");
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
  const rd = reviewWorkDir(project);
  const srcDir = path.join(rd, "backups", "latest");
  if (
    !existsSync(path.join(srcDir, "context.yaml")) &&
    !existsSync(path.join(srcDir, "decisions.jsonl"))
  ) {
    console.error(
      "Erro: backup em backups/latest não encontrado (rode backup antes)"
    );
    return 1;
  }
  console.log("=== restore ===");
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
  const rd = reviewWorkDir(project);
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
  const rd = reviewWorkDir(project);
  const decisions = readMergedDecisions(project);
  if (!decisions.length) {
    console.error(
      "Erro: nenhuma decisão em decisions.jsonl ou decisions-ingest.jsonl"
    );
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

/**
 * Preview local de convencoes.md (workdir).
 * Store / LLM reconcile = só ingest CI — não promove no banco daqui.
 */
export async function cmdPromover(
  project: string,
  write: boolean,
  allCandidates: boolean
): Promise<number> {
  ensureV2Scaffold(project);
  const rd = reviewWorkDir(project);
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
  }

  const candidates = (
    (context.candidates as Array<Record<string, unknown>>) ?? []
  ).map((c) => ({ ...c }));
  const conventionRules =
    (context.convention_rules as Array<Record<string, unknown>>) ?? [];

  const pending = [
    ...conventionRules.map((r) => ({
      id: String(r.id ?? stableFindingId(String(r.rule ?? r.summary ?? ""))),
      scope: String(r.scope ?? "**/*"),
      rule: String("rule" in r ? r.rule : r.summary ?? ""),
      occurrences: 2,
      promoted: Boolean(r.promoted),
    })),
    ...candidates.filter((c) => {
      if (c.promoted) return false;
      if (!allCandidates && Number(c.occurrences ?? 1) < 2) return false;
      return true;
    }),
  ].filter((c) => String(c.rule ?? "").trim());

  if (!pending.length) {
    console.log("Nenhuma regra para promover.");
    return 0;
  }

  const sections: Record<string, string[]> = {};
  const promotedIds = new Set<string>();
  for (const c of pending) {
    const scope = String(c.scope ?? "**/*");
    const rule = String(c.rule ?? "").trim();
    sections[scope] = sections[scope] ?? [];
    sections[scope].push(rule);
    promotedIds.add(String(c.id ?? ""));
  }

  const out = path.join(rd, "convencoes.md");
  const existing = existsSync(out) ? readFileSync(out, "utf8") : "";
  const [merged, added] = mergePromotedIntoConvencoes(existing, sections);

  console.log("=== promover (preview local) ===");
  console.log(`Candidatos: ${pending.length}`);
  console.log(`Bullets novos: ${added}`);
  console.log(
    "Store: conventions só no ingest CI (reconcile keywords + LLM)."
  );

  if (!write) {
    console.log("\nDry-run. Use --write para gravar convencoes.md + promoted.");
    return 0;
  }

  writeFileSync(out, merged, "utf8");
  context.candidates = candidates.map((c) =>
    promotedIds.has(String(c.id ?? "")) ? { ...c, promoted: true } : c
  );
  writeContext(rd, context);
  console.log(`\nGravado: ${out} (+${added})`);
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
