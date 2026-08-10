#!/usr/bin/env node
/**
 * Smoke: grava run + finding + decision no Supabase local.
 * Ver docs/okf/supabase-local.md
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stableFindingId } from "../src/shared/index.js";
import {
  ReviewStore,
  StoreError,
  loadConfig,
  loadDotenvFile,
} from "../src/store/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(packageRoot, "../..");

function parseArgs(argv: string[]): { slug?: string; envFile?: string } {
  const out: { slug?: string; envFile?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slug" && argv[i + 1]) out.slug = argv[++i];
    else if (a === "--env-file" && argv[i + 1]) out.envFile = argv[++i];
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const envCandidates = args.envFile
    ? [path.resolve(args.envFile)]
    : [path.join(process.cwd(), ".env"), path.join(monorepoRoot, ".env")];

  for (const p of envCandidates) {
    await loadDotenvFile(p);
  }

  const config = loadConfig({ projectSlug: args.slug });
  const store = new ReviewStore(config);
  const projectId = await store.getProjectId();

  const run = await store.createRun(projectId, {
    source: "local",
    status: "running",
    actorKind: "tool",
    actorRef: "review-store-smoke",
    gitSha: "smoke",
    branch: "local",
    reviewSlug: "smoke-run",
    meta: { kind: "smoke", runtime: "node" },
  });

  const summary = "smoke — store unificado grava finding de demo";
  const findingKey = stableFindingId(summary);
  const finding = await store.createFinding(String(run.id), {
    findingKey,
    summary,
    filePath: "docs/okf/review-store.md",
    lineStart: 1,
    severity: "info",
    category: "smoke",
    body: "Finding sintético; sem código de cliente.",
  });

  const decision = await store.createDecision(projectId, {
    findingKey,
    verdict: "nao-aplicavel",
    runId: String(run.id),
    reason: "smoke local",
    decidedBy: "review-store-smoke",
    source: "smoke",
    filePath: finding.file_path as string,
    summary,
  });

  await store.completeRun(String(run.id), { status: "completed" });

  console.log(
    JSON.stringify(
      {
        ok: true,
        runtime: "node",
        project_slug: config.projectSlug,
        project_id: projectId,
        run_id: run.id,
        finding_id: finding.id,
        finding_key: findingKey,
        decision_id: decision.id,
      },
      null,
      2
    )
  );
}

main().catch((err: unknown) => {
  const msg =
    err instanceof StoreError
      ? err.message
      : err instanceof Error
        ? err.stack || err.message
        : String(err);
  console.error(`review-store-smoke: FAIL — ${msg}`);
  process.exit(1);
});
