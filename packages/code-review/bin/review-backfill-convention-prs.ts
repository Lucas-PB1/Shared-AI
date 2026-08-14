#!/usr/bin/env node
/**
 * Backfill conventions.meta: evidence_decision_ids (fonte real) + related_prs.
 * Remove evidence[] denormalizado e source_prs legado.
 *
 * Uso:
 *   npx tsx packages/code-review/bin/review-backfill-convention-prs.ts --cloud --slug hostdime-hub --write
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  META_ABSORBED_FINDING_KEYS,
  META_EVIDENCE_COUNT,
  META_EVIDENCE_DECISION_IDS,
  META_RELATED_PRS,
  ReviewStore,
  absorbedFindingKeysFromMeta,
  loadConfig,
  loadDotenvFile,
  provenanceFromDecisions,
} from "../src/store/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");

function parseArgs(argv: string[]) {
  let write = false;
  let cloud = false;
  let slug: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") write = true;
    else if (a === "--cloud") cloud = true;
    else if (a === "--slug" && argv[i + 1]) slug = argv[++i];
  }
  return { write, cloud, slug };
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

  const slug = args.slug ?? env.REVIEW_PROJECT_SLUG ?? "hostdime-hub";
  const store = new ReviewStore(loadConfig({ env, projectSlug: slug }));
  const projectId = await store.getProjectId();
  const decisions = await store.listDecisions(projectId, { limit: 500 });
  const conventions = await store.listConventions(projectId, { limit: 500 });

  console.log(
    `=== backfill evidence_decision_ids (${args.cloud ? "cloud" : "local"}) ${
      args.write ? "WRITE" : "dry-run"
    } slug=${slug} ===`
  );

  let changed = 0;
  for (const row of conventions) {
    const id = String(row.id ?? "");
    if (!id) continue;
    const primary = String(row.finding_key ?? "").trim();
    const absorbed = absorbedFindingKeysFromMeta(row.meta);
    const keys = [...new Set([primary, ...absorbed].filter(Boolean))];
    const prov = provenanceFromDecisions(decisions, keys);
    changed += 1;
    console.log(
      JSON.stringify({
        id: id.slice(0, 8),
        finding_key: primary,
        evidence_count: prov.evidenceCount,
        evidence_decision_ids: prov.decisionIds.map((x) => x.slice(0, 8)),
        related_prs: prov.relatedPrs,
      })
    );
    if (!args.write) continue;
    const meta =
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? { ...(row.meta as Record<string, unknown>) }
        : {};
    meta[META_ABSORBED_FINDING_KEYS] =
      absorbed.length > 0 ? absorbed : keys;
    meta[META_EVIDENCE_DECISION_IDS] = prov.decisionIds;
    meta[META_EVIDENCE_COUNT] = prov.evidenceCount;
    meta[META_RELATED_PRS] = prov.relatedPrs;
    delete meta.evidence;
    delete meta.source_prs;
    delete meta.source_decision_sources;
    await store.upsertConvention(projectId, {
      id,
      body: String(row.body ?? ""),
      scopeGlob: String(row.scope_glob ?? "**/*"),
      findingKey: primary || null,
      occurrences: Math.max(
        Number(row.occurrences ?? 1) || 1,
        prov.evidenceCount
      ),
      source: row.source != null ? String(row.source) : null,
      meta,
    });
  }

  console.log({ conventions: conventions.length, would_change: changed });
  if (!args.write) console.log("Dry-run. Use --write para aplicar.");
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
