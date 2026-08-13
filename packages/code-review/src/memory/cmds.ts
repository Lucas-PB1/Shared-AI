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
import {
  decideConventionPromotion,
  isConventionLlmEnabled,
  type ConventionPromoteDecision,
  type ExistingConventionView,
} from "../store/convention-promote.js";
import { loadContext, writeContext } from "./context-yaml.js";
import {
  buildContext,
  ensureV2Scaffold,
  fileStats,
  mode,
  readMergedDecisions,
} from "./decisions-io.js";
import {
  mergePromotedIntoConvencoes,
  parseConvencoesSections,
  renderConvencoesSections,
} from "./merge.js";
import { localStamp, reviewDir } from "./paths.js";

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
  const rd = reviewDir(project);
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

function existingFromConvencoesMd(raw: string): ExistingConventionView[] {
  const [, sections] = parseConvencoesSections(raw);
  const out: ExistingConventionView[] = [];
  let i = 0;
  for (const section of sections) {
    for (const bullet of section.bullets) {
      const body = bullet.replace(/^- /, "").trim();
      if (!body) continue;
      out.push({
        id: `local-${i}`,
        findingKey: null,
        body,
        scopeGlob: section.glob || section.label || "**/*",
        occurrences: 1,
        absorbedFindingKeys: [],
        supersededBy: null,
      });
      i += 1;
    }
  }
  return out;
}

function applyLocalPromoteDecision(
  existingMd: string,
  decision: {
    action: string;
    body: string;
    scopeGlob: string;
    matchId: string | null;
  },
  existingViews: ExistingConventionView[]
): { md: string; added: number } {
  if (decision.action === "skip" && decision.matchId) {
    return { md: existingMd, added: 0 };
  }
  if (decision.action === "merge" && decision.matchId) {
    const match = existingViews.find((c) => c.id === decision.matchId);
    if (!match) {
      const [md, added] = mergePromotedIntoConvencoes(existingMd, {
        [decision.scopeGlob]: [decision.body],
      });
      return { md, added };
    }
    const [preamble, sections] = parseConvencoesSections(existingMd);
    let replaced = false;
    for (const section of sections) {
      for (let bi = 0; bi < section.bullets.length; bi++) {
        const text = section.bullets[bi].replace(/^- /, "").trim();
        if (text === match.body) {
          section.bullets[bi] = decision.body.startsWith("- ")
            ? decision.body
            : `- ${decision.body}`;
          replaced = true;
          break;
        }
      }
      if (replaced) break;
    }
    if (!replaced) {
      const [md, added] = mergePromotedIntoConvencoes(existingMd, {
        [decision.scopeGlob || match.scopeGlob]: [decision.body],
      });
      return { md, added };
    }
    return {
      md: renderConvencoesSections(preamble, sections),
      added: 0,
    };
  }
  const [md, added] = mergePromotedIntoConvencoes(existingMd, {
    [decision.scopeGlob || "**/*"]: [decision.body],
  });
  return { md, added };
}

export async function cmdPromover(
  project: string,
  write: boolean,
  allCandidates: boolean
): Promise<number> {
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

  const out = path.join(rd, "convencoes.md");
  let md = existsSync(out) ? readFileSync(out, "utf8") : "";
  let addedTotal = 0;
  const useLlm = isConventionLlmEnabled();
  const promotedIds = new Set<string>();

  console.log("=== promover (proposta) ===");
  console.log(`Candidatos: ${pending.length}`);
  console.log(`LLM: ${useLlm ? "sim" : "não (heurística / REVIEW_CONVENTION_LLM=0)"}`);

  for (const c of pending) {
    const findingKey = String(c.id ?? "");
    const rule = String(c.rule ?? "").trim();
    const scope = String(c.scope ?? "**/*");
    const existingViews = existingFromConvencoesMd(md);

    // Já presente por texto exato → marca promoted, sem reconverter.
    if (
      existingViews.some(
        (e) => e.body.trim() === rule || e.body.trim() === rule.replace(/^- /, "")
      )
    ) {
      promotedIds.add(findingKey);
      continue;
    }

    let decision: ConventionPromoteDecision = {
      action: "create",
      body: rule,
      scopeGlob: scope,
      matchId: null,
      alsoAbsorbIds: [],
      rationale: "heuristic",
    };

    if (useLlm) {
      try {
        decision = await decideConventionPromotion({
          facts: [
            {
              findingKey,
              summary: rule,
              scopeGlob: scope,
            },
          ],
          existing: existingViews,
          fallbackBody: rule,
          fallbackScopeGlob: scope,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`promover LLM falhou (${findingKey}): ${msg} — heurística`);
      }
    }

    const applied = applyLocalPromoteDecision(md, decision, existingViews);
    md = applied.md;
    addedTotal += applied.added;
    promotedIds.add(findingKey);
    console.log(
      `  [${decision.action}] ${findingKey.slice(0, 40)} → ${decision.body.slice(0, 60)}`
    );
  }

  console.log(`Bullets novos/alterados: ${addedTotal}`);
  console.log(`Tamanho: ${md.length} bytes`);

  if (!write) {
    console.log("\nDry-run. Use --write para gravar convencoes.md + promoted.");
    return 0;
  }

  writeFileSync(out, md, "utf8");
  context.candidates = candidates.map((c) =>
    promotedIds.has(String(c.id ?? ""))
      ? { ...c, promoted: true }
      : c
  );
  writeContext(rd, context);
  console.log(`\nGravado: ${out}`);
  console.log(`context.yaml: ${promotedIds.size} candidate(s) marked promoted`);
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
