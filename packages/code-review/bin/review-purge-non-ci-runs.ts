#!/usr/bin/env node
/**
 * Remove review_runs (e findings em cascata) que não são source=ci.
 * Fonte canônica da memória de review = CI remoto.
 *
 *   tsx packages/code-review/bin/review-purge-non-ci-runs.ts [--cloud] [--write]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadDotenvFile } from "../src/store/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function parseArgs(argv: string[]) {
  let write = false;
  let cloud = false;
  for (const a of argv) {
    if (a === "--write") write = true;
    if (a === "--cloud") cloud = true;
  }
  return { write, cloud };
}

async function main(): Promise<number> {
  await loadDotenvFile(path.join(root, ".env"));
  const args = parseArgs(process.argv.slice(2));
  const env = process.env;

  const url = args.cloud
    ? String(env.SUPABASE_CLOUD_URL ?? "").trim()
    : String(env.SUPABASE_LOCAL_URL || env.SUPABASE_URL || "").trim();
  const key = args.cloud
    ? String(env.SUPABASE_CLOUD_SECRET_KEY ?? "").trim()
    : String(
        env.SUPABASE_LOCAL_SECRET_KEY ||
          env.SUPABASE_SECRET_KEY ||
          env.SUPABASE_SERVICE_ROLE_KEY ||
          ""
      ).trim();

  if (!url || !key) {
    console.error("URL/chave Supabase ausente");
    return 1;
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    Prefer: "return=representation",
  };

  const listRes = await fetch(
    `${url}/rest/v1/review_runs?select=id,source,review_slug,pr_number,actor_ref&source=neq.ci`,
    { headers }
  );
  const junk = (await listRes.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(junk)) {
    console.error(junk);
    return 1;
  }

  console.log(
    `=== purge non-CI (${args.cloud ? "cloud" : "local"}) ${
      args.write ? "WRITE" : "dry-run"
    } ===`
  );
  console.log(`candidatos=${junk.length}`);
  for (const r of junk) {
    console.log(
      `  ${r.source} slug=${r.review_slug ?? "—"} pr=${r.pr_number ?? "—"} actor=${r.actor_ref ?? "—"} id=${r.id}`
    );
  }

  if (!args.write || junk.length === 0) {
    if (!args.write && junk.length > 0) {
      console.log("Dry-run. Rode com --write para apagar.");
    }
    return 0;
  }

  const ids = junk.map((r) => String(r.id));
  // findings e decisions.com run_id: ON DELETE CASCADE / SET NULL no schema
  const del = await fetch(
    `${url}/rest/v1/review_runs?id=in.(${ids.join(",")})`,
    { method: "DELETE", headers }
  );
  if (!del.ok) {
    console.error(await del.text());
    return 1;
  }
  console.log(`apagados=${ids.length} review_runs (findings em cascata)`);
  return 0;
}

main().then((c) => process.exit(c));
