#!/usr/bin/env node
/**
 * Dual-write de decisões locais → store (U1 soft).
 * Uso após /finalizar (append em decisions.jsonl) ou reprocessamento.
 *
 * Offline se SUPABASE_URL/chave ausentes (exit 0, attempted=false).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DECISIONS_INGEST_FILE,
  readDecisions,
  reviewDir,
} from "../src/memory/index.js";
import {
  dualWriteDecisions,
  loadDotenvFile,
  logDualWriteResult,
} from "../src/store/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");

function parseArgs(argv: string[]): {
  project: string;
  source?: string;
  all: boolean;
} {
  let project = ".";
  let source: string | undefined;
  let all = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project" && argv[i + 1]) project = argv[++i];
    else if (a === "--source" && argv[i + 1]) source = argv[++i];
    else if (a === "--all") all = true;
    else if (!a.startsWith("-")) project = a;
  }
  return { project, source, all };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const project = path.resolve(args.project);
  for (const p of [
    path.join(project, ".env"),
    path.join(monorepoRoot, ".env"),
  ]) {
    await loadDotenvFile(p);
  }

  const rd = reviewDir(project);
  const primary = path.join(rd, "decisions.jsonl");
  const ingest = path.join(rd, DECISIONS_INGEST_FILE);
  let rows = [...readDecisions(primary), ...readDecisions(ingest)];
  if (args.source) {
    rows = rows.filter((d) => String(d.source ?? "") === args.source);
  }
  if (!args.all && rows.length > 50) {
    rows = rows.slice(-50);
  }

  if (!rows.length) {
    console.error("Nenhuma decisão para dual-write");
    return 1;
  }

  const result = await dualWriteDecisions(rows, {
    run: {
      source: "local",
      actorKind: "tool",
      actorRef: "review-dual-write",
      meta: { kind: "finalize-or-replay", count: rows.length },
    },
    decidedBy: "review-dual-write",
  });
  logDualWriteResult("review-dual-write", result);
  console.log(
    JSON.stringify(
      {
        ok: !result.error,
        attempted: result.attempted,
        written: result.written,
        skipped: result.skipped,
        run_id: result.runId ?? null,
        error: result.error ?? null,
        input: rows.length,
      },
      null,
      2
    )
  );
  // Offline sem store = sucesso (soft). Erro de rede = 1.
  if (!result.attempted) return 0;
  return result.error ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
