#!/usr/bin/env node
/**
 * Dual-write de decisões locais → store (obrigatório).
 * Uso após /finalizar (append em decisions.jsonl) ou reprocessamento.
 *
 * Secrets (SUPABASE_*): sempre do monorepo hostdime-ia / HOSTDIME_IA_ROOT.
 * Projetos ligados (ex. DNA, hostdime-hub) **não** precisam de .env —
 * slug via --slug, git remote origin, basename ou REVIEW_PROJECT_SLUG no CI.
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
import {
  preserveProcessReviewSlugAfter,
  resolveProjectSlug,
} from "../src/store/project-slug.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");

function parseArgs(argv: string[]): {
  project: string;
  source?: string;
  slug?: string;
  all: boolean;
} {
  let project = ".";
  let source: string | undefined;
  let slug: string | undefined;
  let all = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project" && argv[i + 1]) project = argv[++i];
    else if (a === "--source" && argv[i + 1]) source = argv[++i];
    else if (a === "--slug" && argv[i + 1]) slug = argv[++i];
    else if (a === "--all") all = true;
    else if (!a.startsWith("-")) project = a;
  }
  return { project, source, slug, all };
}

async function loadStoreSecrets(): Promise<void> {
  const iaRoot =
    String(process.env.HOSTDIME_IA_ROOT ?? "").trim() || monorepoRoot;
  await preserveProcessReviewSlugAfter(async () => {
    for (const root of new Set([iaRoot, monorepoRoot])) {
      await loadDotenvFile(path.join(root, ".env"));
    }
  });
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const project = path.resolve(args.project);
  await loadStoreSecrets();
  const projectSlug = resolveProjectSlug(project, args.slug);

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
    console.error("Nenhuma decisão para dual-write (ok)");
    console.log(
      JSON.stringify({
        ok: true,
        attempted: false,
        written: 0,
        skipped: 0,
        input: 0,
        project_slug: projectSlug,
      })
    );
    return 0;
  }

  const result = await dualWriteDecisions(rows, {
    projectSlug,
    run: {
      source: "local",
      actorKind: "tool",
      actorRef: "review-dual-write",
      meta: {
        kind: "finalize-or-replay",
        count: rows.length,
        project_root: project,
        project_slug: projectSlug,
      },
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
        findings: result.findings ?? 0,
        exclusions: result.exclusions ?? 0,
        conventions: result.conventions ?? 0,
        run_id: result.runId ?? null,
        error: result.error ?? null,
        input: rows.length,
        project_slug: projectSlug,
      },
      null,
      2
    )
  );
  return result.error ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
