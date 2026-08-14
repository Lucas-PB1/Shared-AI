#!/usr/bin/env node
/**
 * Auditoria cloud: conventions vs modelo (≥2 evidências, sem tema duplicado).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ReviewStore,
  activeConventions,
  aggregateUncoveredAceitos,
  findNearCoveringConvention,
  loadConfig,
  loadDotenvFile,
  rowToExistingConvention,
} from "../src/store/index.js";
import {
  SLUG_NEAR_MIN_SCORE,
  slugSimilarity,
} from "../src/shared/finding-ids.js";
import { inferScopeFromFile } from "../src/memory/merge.js";

const monorepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

async function main(): Promise<number> {
  await loadDotenvFile(path.join(monorepoRoot, ".env"));
  const env = { ...process.env };
  const url = String(env.SUPABASE_CLOUD_URL ?? "").trim();
  const secret = String(env.SUPABASE_CLOUD_SECRET_KEY ?? "").trim();
  if (!url || !secret) {
    console.error("SUPABASE_CLOUD_URL / SUPABASE_CLOUD_SECRET_KEY");
    return 1;
  }
  env.SUPABASE_URL = url;
  env.SUPABASE_SECRET_KEY = secret;
  env.SUPABASE_SERVICE_ROLE_KEY = secret;

  const store = new ReviewStore(
    loadConfig({ env, projectSlug: "hostdime-hub" })
  );
  const pid = await store.getProjectId();
  const decisions = await store.listDecisions(pid, { limit: 500 });
  const rows = await store.listConventions(pid, { limit: 500 });
  const existing = rows
    .map(rowToExistingConvention)
    .filter((c) => c != null);
  const active = activeConventions(existing);

  console.log("=== CLOUD audit hostdime-hub ===");
  console.log({
    decisions: decisions.length,
    conventions: active.length,
    aceitos: decisions.filter((d) => d.verdict === "aceito").length,
  });

  const weak: Array<Record<string, unknown>> = [];
  const ok: Array<Record<string, unknown>> = [];

  for (const c of active) {
    const absorbed = [
      ...new Set(
        [c.findingKey, ...c.absorbedFindingKeys].filter(Boolean) as string[]
      ),
    ];
    const evidence = Math.max(absorbed.length, c.occurrences);
    const item = {
      id: c.id.slice(0, 8),
      finding_key: c.findingKey,
      evidence_keys: absorbed.length,
      occurrences: c.occurrences,
      evidence,
      related_prs: c.relatedPrs,
      absorbed,
      body: c.body.slice(0, 100),
    };
    if (evidence >= 2) ok.push(item);
    else weak.push(item);
  }

  console.log("\n=== FAIL: evidence < 2 ===");
  if (!weak.length) console.log("(none)");
  for (const w of weak) console.log(JSON.stringify(w));

  console.log("\n=== OK conventions ===");
  for (const o of ok) {
    console.log(
      JSON.stringify({
        id: o.id,
        key: o.finding_key,
        evidence: o.evidence,
        keys: o.evidence_keys,
        prs: o.related_prs,
        body: o.body,
      })
    );
  }

  console.log(
    "\n=== Near-slug across DIFFERENT conventions (possible duplicate themes) ==="
  );
  const pairs: Array<Record<string, unknown>> = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const A = active[i];
      const B = active[j];
      const keysA = [A.findingKey, ...A.absorbedFindingKeys].filter(
        Boolean
      ) as string[];
      const keysB = [B.findingKey, ...B.absorbedFindingKeys].filter(
        Boolean
      ) as string[];
      let best = 0;
      let ba = "";
      let bb = "";
      for (const ka of keysA) {
        for (const kb of keysB) {
          const s = slugSimilarity(ka, kb);
          if (s > best) {
            best = s;
            ba = ka;
            bb = kb;
          }
        }
      }
      if (best >= SLUG_NEAR_MIN_SCORE) {
        pairs.push({
          score: Number(best.toFixed(3)),
          a: ba,
          b: bb,
          ca: `${A.id.slice(0, 8)}:${A.findingKey ?? ""}`,
          cb: `${B.id.slice(0, 8)}:${B.findingKey ?? ""}`,
          body_a: A.body.slice(0, 60),
          body_b: B.body.slice(0, 60),
        });
      }
    }
  }
  pairs.sort((x, y) => Number(y.score) - Number(x.score));
  if (!pairs.length) console.log("(none)");
  for (const p of pairs) console.log(JSON.stringify(p));

  const uncovered = aggregateUncoveredAceitos(
    decisions,
    existing,
    inferScopeFromFile
  );
  console.log("\n=== Still uncovered aceitos ===");
  console.log({ count: uncovered.length });
  for (const u of uncovered) {
    console.log(
      JSON.stringify({
        key: u.findingKey,
        occ: u.occurrences,
        prs: u.relatedPrs,
        summary: u.summary.slice(0, 70),
      })
    );
  }

  console.log(
    "\n=== Uncovered near-matching existing (should merge next ingest) ==="
  );
  let nearHits = 0;
  for (const u of uncovered) {
    const hit = findNearCoveringConvention(active, [u.findingKey]);
    if (hit) {
      nearHits += 1;
      console.log(
        JSON.stringify({
          key: u.findingKey,
          score: Number(hit.score.toFixed(3)),
          would_merge_into: hit.convention.findingKey,
          body: hit.convention.body.slice(0, 60),
        })
      );
    }
  }
  if (!nearHits) console.log("(none)");

  console.log("\n=== verdict ===");
  console.log({
    conventions_ok_evidence: ok.length,
    conventions_weak: weak.length,
    cross_convention_near_pairs: pairs.length,
    uncovered: uncovered.length,
    uncovered_near_existing: nearHits,
    model_pass:
      weak.length === 0 &&
      // near across conventions needs human/LLM judgment; flag only
      true,
  });
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
