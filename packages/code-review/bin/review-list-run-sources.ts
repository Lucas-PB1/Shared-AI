#!/usr/bin/env node
/**
 * Lista runs por source (local vs cloud) — diagnóstico.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotenvFile } from "../src/store/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function main() {
  await loadDotenvFile(path.join(root, ".env"));
  const env = process.env;

  async function probe(label: string, url: string, key: string) {
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    };
    const runs = (await fetch(
      `${url}/rest/v1/review_runs?select=id,source,review_slug,pr_number,actor_ref&limit=500`,
      { headers }
    ).then((r) => r.json())) as Array<Record<string, unknown>>;
    const by: Record<string, number> = {};
    for (const r of runs) {
      const s = String(r.source ?? "?");
      by[s] = (by[s] ?? 0) + 1;
    }
    console.log(`\n${label} runs=${runs.length}`, by);
    for (const r of runs) {
      console.log(
        `  ${r.source} slug=${r.review_slug ?? "—"} pr=${r.pr_number ?? "—"} actor=${r.actor_ref ?? "—"} id=${String(r.id).slice(0, 8)}`
      );
    }
  }

  await probe(
    "LOCAL",
    String(env.SUPABASE_LOCAL_URL || "http://127.0.0.1:54321"),
    String(env.SUPABASE_LOCAL_SECRET_KEY || env.SUPABASE_SECRET_KEY)
  );
  await probe(
    "CLOUD",
    String(env.SUPABASE_CLOUD_URL),
    String(env.SUPABASE_CLOUD_SECRET_KEY)
  );
}

main();
