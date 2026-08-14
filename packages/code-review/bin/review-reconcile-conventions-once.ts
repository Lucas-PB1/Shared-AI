#!/usr/bin/env node
/**
 * One-shot: reconcile conventions via Cursor agent (session login),
 * mesmo pipeline de prod (reconcileConventionsWithLlm + callLLM path).
 *
 * Uso:
 *   npx tsx packages/code-review/bin/review-reconcile-conventions-once.ts --cloud --slug hostdime-hub
 *   npx tsx packages/code-review/bin/review-reconcile-conventions-once.ts --slug hostdime-hub
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inferScopeFromFile } from "../src/memory/merge.js";
import {
  ReviewStore,
  aggregateUncoveredAceitos,
  loadConfig,
  loadDotenvFile,
  reconcileConventionsWithLlm,
  rowToExistingConvention,
} from "../src/store/index.js";
import { nearSlugPairs } from "../src/shared/finding-ids.js";
import {
  buildConventionReconcileUserPrompt,
  loadConventionReconcileSystemPrompt,
} from "../src/store/convention-promote.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");
const packageRoot = path.resolve(__dirname, "..");

function parseArgs(argv: string[]) {
  let cloud = false;
  let write = true;
  let slug: string | null = null;
  let dryPrompt = false;
  let fromRaw: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cloud") cloud = true;
    else if (a === "--dry-prompt") dryPrompt = true;
    else if (a === "--no-write") write = false;
    else if (a === "--slug" && argv[i + 1]) slug = argv[++i];
    else if (a === "--from-raw" && argv[i + 1]) fromRaw = argv[++i];
  }
  return { cloud, write, slug, dryPrompt, fromRaw };
}

function resolveAgentBin(): string {
  const candidates = [
    process.env.CURSOR_AGENT_BIN,
    `${process.env.HOME}/.local/bin/agent`,
    `${process.env.HOME}/.cursor/bin/agent`,
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return "agent";
}

/** Igual callCursor de prod, mas usa sessão logada (sem exigir CURSOR_API_KEY no .env). */
async function callCursorSession(
  system: string,
  user: string
): Promise<string> {
  const prompt = `${system}\n\n---\n\n${user}`;
  const agent = resolveAgentBin();
  const env = { ...process.env };
  delete env.CURSOR_API_KEY;
  delete env.REVIEW_LLM_API_KEY;

  console.error(
    `LLM via ${agent} (session) system=${system.length}c user=${user.length}c`
  );
  const result = spawnSync(agent, ["-p", "--force", prompt], {
    encoding: "utf8",
    env,
    maxBuffer: 15 * 1024 * 1024,
    timeout: 600_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "agent failed").trim();
    throw new Error(`Cursor agent exit ${result.status}: ${err.slice(0, 800)}`);
  }
  const out = (result.stdout || "").trim();
  const rawPath = path.join("/tmp", "convention-reconcile-llm-raw.txt");
  fs.writeFileSync(rawPath, out);
  console.error(`LLM raw → ${rawPath} (${out.length} chars)`);
  return out;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  await loadDotenvFile(path.join(monorepoRoot, ".env"));
  await loadDotenvFile(path.join(process.cwd(), ".env"));

  const env = { ...process.env };
  if (args.cloud) {
    const url = String(env.SUPABASE_CLOUD_URL ?? "").trim();
    const secret = String(env.SUPABASE_CLOUD_SECRET_KEY ?? "").trim();
    if (!url || !secret) {
      console.error("Cloud: SUPABASE_CLOUD_URL / SUPABASE_CLOUD_SECRET_KEY");
      return 1;
    }
    env.SUPABASE_URL = url;
    env.SUPABASE_SECRET_KEY = secret;
    env.SUPABASE_SERVICE_ROLE_KEY = secret;
  } else {
    const localUrl = String(env.SUPABASE_LOCAL_URL ?? "").trim();
    const localKey = String(env.SUPABASE_LOCAL_SECRET_KEY ?? "").trim();
    if (localUrl) env.SUPABASE_URL = localUrl;
    if (localKey) {
      env.SUPABASE_SECRET_KEY = localKey;
      env.SUPABASE_SERVICE_ROLE_KEY = localKey;
    }
  }

  // Force LLM path like prod when key exists; here we inject callLlm.
  env.REVIEW_CONVENTION_LLM = "1";

  const slug = args.slug ?? env.REVIEW_PROJECT_SLUG ?? "hostdime-hub";
  const cfg = loadConfig({ env, projectSlug: slug });
  const store = new ReviewStore(cfg);
  const projectId = await store.getProjectId();

  console.log(
    `=== reconcile LLM (${args.cloud ? "cloud" : "local"}) slug=${slug} write=${args.write} ===`
  );
  console.log({ project_id: projectId });

  const decisions = await store.listDecisions(projectId, { limit: 500 });
  const existingRows = await store.listConventions(projectId, { limit: 500 });
  const existing = existingRows
    .map(rowToExistingConvention)
    .filter((c): c is NonNullable<typeof c> => c != null);
  const uncovered = aggregateUncoveredAceitos(
    decisions,
    existing,
    inferScopeFromFile
  );
  const near = nearSlugPairs(uncovered.map((f) => f.findingKey));

  console.log({
    decisions: decisions.length,
    conventions_before: existingRows.length,
    uncovered_keys: uncovered.length,
    near_slug_pairs: near.length,
  });

  if (args.dryPrompt) {
    const system = loadConventionReconcileSystemPrompt(packageRoot);
    const user = buildConventionReconcileUserPrompt(uncovered, existing);
    console.log("\n=== SYSTEM ===\n" + system);
    console.log("\n=== USER (first 4k) ===\n" + user.slice(0, 4000));
    return 0;
  }

  if (!args.write) {
    console.log("Use sem --no-write para aplicar. Abortando.");
    return 0;
  }

  const result = await reconcileConventionsWithLlm({
    port: store,
    projectId,
    decisions,
    existingRows,
    inferScope: inferScopeFromFile,
    env,
    callLlm: args.fromRaw
      ? async () => {
          const raw = fs.readFileSync(args.fromRaw!, "utf8");
          console.error(`LLM from file ${args.fromRaw} (${raw.length} chars)`);
          return raw;
        }
      : callCursorSession,
    source: "reconcile-llm",
    packageRoot,
  });

  console.log("\n=== result ===");
  console.log(result);

  const after = await store.listConventions(projectId, { limit: 500 });
  console.log(`\n=== conventions after (${after.length}) ===`);
  for (const c of after) {
    console.log(
      JSON.stringify({
        id: String(c.id ?? "").slice(0, 8),
        finding_key: c.finding_key,
        occurrences: c.occurrences,
        scope: c.scope_glob,
        source: c.source,
        body: String(c.body ?? "").slice(0, 200),
        absorbed:
          c.meta && typeof c.meta === "object" && !Array.isArray(c.meta)
            ? (c.meta as Record<string, unknown>).absorbed_finding_keys
            : undefined,
      })
    );
  }

  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
