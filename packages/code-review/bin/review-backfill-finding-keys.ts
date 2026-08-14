#!/usr/bin/env node
/**
 * Regrava finding_key em **todas** as superfícies do store com ingestFindingKey.
 *
 * Colunas / JSON:
 *   - decisions.finding_key
 *   - findings.finding_key
 *   - exclusions.finding_key
 *   - conventions.finding_key
 *   - conventions.meta.absorbed_finding_keys
 *   - review_runs.meta.finding_keys
 *
 * Uso:
 *   npm run review:backfill-finding-keys -- --slug hostdime-hub
 *   npm run review:backfill-finding-keys -- --cloud --slug hostdime-hub --write
 *   npm run review:backfill-finding-keys -- --cloud --slug hostdime-hub --write --promote
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ingestFindingKey } from "../src/ingest/classify.js";
import { FINDING_SLUG_MAX_LEN } from "../src/shared/finding-ids.js";
import { inferScopeFromFile } from "../src/memory/merge.js";
import {
  META_ABSORBED_FINDING_KEYS,
  ReviewStore,
  loadConfig,
  loadDotenvFile,
  reconcileConventionsWithLlm,
} from "../src/store/index.js";
import type { SupabaseRest } from "../src/store/supabase-rest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");
const PAGE = 500;

type Args = {
  write: boolean;
  cloud: boolean;
  slug: string | null;
  promote: boolean;
};

type TableStats = {
  scanned: number;
  changed: number;
  merged?: number;
  skipped?: number;
  samples: string[];
};

function parseArgs(argv: string[]): Args {
  let write = false;
  let cloud = false;
  let promote = false;
  let slug: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") write = true;
    else if (a === "--cloud") cloud = true;
    else if (a === "--promote") promote = true;
    else if (a === "--slug" && argv[i + 1]) slug = argv[++i];
  }
  return { write, cloud, slug, promote };
}

/** Slug legado (sem NFD): acentos eram dropados → `ttulo`, `restaurao`. */
function legacySlugify(text: string): string {
  const base = String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[-\s]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, FINDING_SLUG_MAX_LEN) || "finding";
}

function keyFromText(text: string, fallback = "finding"): string {
  const t = text.trim();
  if (!t) return fallback.trim() || "finding";
  return ingestFindingKey(t);
}

function remapKey(oldKey: string, map: Map<string, string>): string {
  const k = oldKey.trim();
  if (!k) return k;
  return map.get(k) ?? keyFromText(k.replace(/-/g, " "), k);
}

function emptyStats(): TableStats {
  return { scanned: 0, changed: 0, samples: [] };
}

function pushSample(stats: TableStats, line: string): void {
  if (stats.samples.length < 25) stats.samples.push(line);
}

async function listPaged(
  rest: SupabaseRest,
  table: string,
  filter: Record<string, string>,
  order: string
): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = [];
  let offset = 0;
  for (;;) {
    const q = new URLSearchParams({
      ...filter,
      select: "*",
      order,
      limit: String(PAGE),
      offset: String(offset),
    });
    const url = `${rest.config.restBase}/${table}?${q}`;
    const batch = ((await rest.request("GET", url, rest.headers())) ??
      []) as Array<Record<string, unknown>>;
    out.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

async function patchById(
  rest: SupabaseRest,
  table: string,
  id: string,
  body: Record<string, unknown>
): Promise<void> {
  const url = `${rest.config.restBase}/${table}?id=eq.${id}`;
  await rest.request(
    "PATCH",
    url,
    rest.headers({ prefer: "return=minimal" }),
    body
  );
}

async function deleteById(
  rest: SupabaseRest,
  table: string,
  id: string
): Promise<void> {
  const url = `${rest.config.restBase}/${table}?id=eq.${id}`;
  await rest.request("DELETE", url, rest.headers({ prefer: "return=minimal" }));
}

function rememberMap(
  map: Map<string, string>,
  from: string,
  to: string
): void {
  const a = from.trim();
  const b = to.trim();
  if (!a || !b) return;
  const prev = map.get(a);
  if (prev && prev !== b) {
    console.warn(`  warn: map ${a} → ${prev} vs ${b}`);
    return;
  }
  map.set(a, b);
}

/** Mapa legado/atual → keyword a partir de summaries (decisions + findings). */
async function buildAliasMap(
  rest: SupabaseRest,
  projectId: string,
  runIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const decisions = await listPaged(
    rest,
    "decisions",
    { project_id: `eq.${projectId}` },
    "finalized_at.desc"
  );
  for (const row of decisions) {
    const summary = String(row.summary ?? "").trim();
    const current = String(row.finding_key ?? "").trim();
    if (!summary) continue;
    const next = keyFromText(summary, current || "finding");
    rememberMap(map, legacySlugify(summary), next);
    rememberMap(map, current, next);
    rememberMap(map, next, next);
  }

  const CHUNK = 50;
  for (let i = 0; i < runIds.length; i += CHUNK) {
    const chunk = runIds.slice(i, i + CHUNK);
    const findings = await listPaged(
      rest,
      "findings",
      { run_id: `in.(${chunk.join(",")})` },
      "created_at.desc"
    );
    for (const row of findings) {
      const summary = String(row.summary ?? "").trim();
      const current = String(row.finding_key ?? "").trim();
      if (!summary) continue;
      const next = keyFromText(summary, current || "finding");
      rememberMap(map, legacySlugify(summary), next);
      rememberMap(map, current, next);
      rememberMap(map, next, next);
    }
  }
  return map;
}

async function listRunIds(
  rest: SupabaseRest,
  projectId: string
): Promise<string[]> {
  const rows = await listPaged(
    rest,
    "review_runs",
    { project_id: `eq.${projectId}` },
    "started_at.desc"
  );
  return rows.map((r) => String(r.id ?? "")).filter(Boolean);
}

async function backfillDecisions(
  rest: SupabaseRest,
  projectId: string,
  write: boolean,
  map: Map<string, string>
): Promise<TableStats> {
  const rows = await listPaged(
    rest,
    "decisions",
    { project_id: `eq.${projectId}` },
    "finalized_at.desc"
  );
  const stats = emptyStats();
  stats.scanned = rows.length;
  for (const row of rows) {
    const id = String(row.id ?? "");
    const oldKey = String(row.finding_key ?? "").trim();
    const summary = String(row.summary ?? "").trim();
    const next = summary
      ? keyFromText(summary, oldKey)
      : remapKey(oldKey, map);
    if (!id || next === oldKey) continue;
    stats.changed += 1;
    pushSample(stats, `${oldKey} → ${next}`);
    if (write) await patchById(rest, "decisions", id, { finding_key: next });
  }
  return stats;
}

async function backfillFindings(
  rest: SupabaseRest,
  runIds: string[],
  write: boolean,
  map: Map<string, string>
): Promise<TableStats> {
  const stats = emptyStats();
  if (!runIds.length) return stats;
  const CHUNK = 50;
  for (let i = 0; i < runIds.length; i += CHUNK) {
    const chunk = runIds.slice(i, i + CHUNK);
    const rows = await listPaged(
      rest,
      "findings",
      { run_id: `in.(${chunk.join(",")})` },
      "created_at.desc"
    );
    stats.scanned += rows.length;
    for (const row of rows) {
      const id = String(row.id ?? "");
      const oldKey = String(row.finding_key ?? "").trim();
      const summary = String(row.summary ?? "").trim();
      const next = summary
        ? keyFromText(summary, oldKey)
        : remapKey(oldKey, map);
      if (!id || next === oldKey) continue;
      stats.changed += 1;
      pushSample(stats, `${oldKey} → ${next}`);
      if (write) await patchById(rest, "findings", id, { finding_key: next });
    }
  }
  return stats;
}

async function backfillExclusions(
  rest: SupabaseRest,
  projectId: string,
  write: boolean,
  map: Map<string, string>
): Promise<TableStats> {
  const rows = await listPaged(
    rest,
    "exclusions",
    { project_id: `eq.${projectId}` },
    "updated_at.desc"
  );
  const byTriple = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    byTriple.set(`${row.finding_key}\0${row.scope_glob ?? "**/*"}`, row);
  }
  const stats = emptyStats();
  stats.scanned = rows.length;
  stats.merged = 0;
  stats.skipped = 0;

  for (const row of rows) {
    const id = String(row.id ?? "");
    const oldKey = String(row.finding_key ?? "").trim();
    const scope = String(row.scope_glob ?? "**/*");
    const next = remapKey(oldKey, map);
    if (!id || !oldKey || next === oldKey) {
      if (id && oldKey && !map.has(oldKey) && next === oldKey) stats.skipped! += 1;
      continue;
    }
    const collisionKey = `${next}\0${scope}`;
    const existing = byTriple.get(collisionKey);
    const wouldCollide = existing != null && String(existing.id) !== id;
    stats.changed += 1;
    pushSample(
      stats,
      `${oldKey} → ${next}${wouldCollide ? " (merge)" : ""}`
    );
    if (!write) continue;
    if (wouldCollide && existing) {
      const occ =
        Number(existing.occurrences ?? 1) + Number(row.occurrences ?? 1);
      await patchById(rest, "exclusions", String(existing.id), {
        occurrences: occ,
        updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      });
      await deleteById(rest, "exclusions", id);
      byTriple.delete(`${oldKey}\0${scope}`);
      stats.merged! += 1;
    } else {
      await patchById(rest, "exclusions", id, {
        finding_key: next,
        updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      });
      byTriple.delete(`${oldKey}\0${scope}`);
      byTriple.set(collisionKey, { ...row, finding_key: next });
    }
  }
  return stats;
}

async function backfillConventions(
  rest: SupabaseRest,
  projectId: string,
  write: boolean,
  map: Map<string, string>
): Promise<TableStats> {
  const rows = await listPaged(
    rest,
    "conventions",
    { project_id: `eq.${projectId}` },
    "updated_at.desc"
  );
  const byKey = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const k = String(row.finding_key ?? "").trim();
    if (k) byKey.set(k, row);
  }
  const stats = emptyStats();
  stats.scanned = rows.length;
  stats.merged = 0;

  for (const row of rows) {
    const id = String(row.id ?? "");
    if (!id) continue;
    const oldKey = String(row.finding_key ?? "").trim();
    const nextKey = oldKey ? remapKey(oldKey, map) : oldKey;
    const meta =
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? { ...(row.meta as Record<string, unknown>) }
        : {};
    const absorbedRaw = meta[META_ABSORBED_FINDING_KEYS];
    const absorbed = Array.isArray(absorbedRaw)
      ? absorbedRaw.map((x) => String(x))
      : [];
    const nextAbsorbed = [
      ...new Set(absorbed.map((k) => remapKey(k, map)).filter(Boolean)),
    ];
    if (nextKey) nextAbsorbed.push(nextKey);
    const uniqAbsorbed = [...new Set(nextAbsorbed)];

    const keyChanged = Boolean(oldKey && nextKey && nextKey !== oldKey);
    const absorbedFinal = [...new Set(uniqAbsorbed)];
    const absorbedReallyChanged =
      JSON.stringify([...absorbed].sort()) !==
      JSON.stringify([...absorbedFinal].sort());

    if (!keyChanged && !absorbedReallyChanged) continue;

    stats.changed += 1;
    pushSample(
      stats,
      `${oldKey || "(null)"} → ${nextKey || "(null)"} absorbed ${absorbed.length}→${absorbedFinal.length}`
    );

    if (!write) continue;

    if (keyChanged && nextKey) {
      const existing = byKey.get(nextKey);
      if (existing && String(existing.id) !== id) {
        // merge into existing primary
        const exMeta =
          existing.meta &&
          typeof existing.meta === "object" &&
          !Array.isArray(existing.meta)
            ? { ...(existing.meta as Record<string, unknown>) }
            : {};
        const exAbs = Array.isArray(exMeta[META_ABSORBED_FINDING_KEYS])
          ? (exMeta[META_ABSORBED_FINDING_KEYS] as unknown[]).map(String)
          : [];
        const mergedAbs = [
          ...new Set(
            [...exAbs, ...absorbedFinal, oldKey, nextKey]
              .map((k) => remapKey(k, map))
              .filter(Boolean)
          ),
        ];
        await patchById(rest, "conventions", String(existing.id), {
          occurrences:
            Number(existing.occurrences ?? 1) + Number(row.occurrences ?? 1),
          meta: { ...exMeta, [META_ABSORBED_FINDING_KEYS]: mergedAbs },
          updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
        });
        await deleteById(rest, "conventions", id);
        byKey.delete(oldKey);
        stats.merged! += 1;
        continue;
      }
    }

    const patch: Record<string, unknown> = {
      meta: { ...meta, [META_ABSORBED_FINDING_KEYS]: absorbedFinal },
      updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    };
    if (keyChanged && nextKey) patch.finding_key = nextKey;
    await patchById(rest, "conventions", id, patch);
    if (keyChanged && nextKey) {
      byKey.delete(oldKey);
      byKey.set(nextKey, { ...row, finding_key: nextKey });
    }
  }
  return stats;
}

async function backfillRunMeta(
  rest: SupabaseRest,
  projectId: string,
  write: boolean,
  map: Map<string, string>
): Promise<TableStats> {
  const rows = await listPaged(
    rest,
    "review_runs",
    { project_id: `eq.${projectId}` },
    "started_at.desc"
  );
  const stats = emptyStats();
  stats.scanned = rows.length;

  for (const row of rows) {
    const id = String(row.id ?? "");
    const meta =
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? { ...(row.meta as Record<string, unknown>) }
        : null;
    if (!id || !meta) continue;
    const raw = meta.finding_keys;
    if (!Array.isArray(raw) || !raw.length) continue;
    const oldKeys = raw.map((x) => String(x));
    const nextKeys = oldKeys.map((k) => remapKey(k, map));
    const changed = oldKeys.some((k, i) => k !== nextKeys[i]);
    if (!changed) continue;
    stats.changed += 1;
    pushSample(
      stats,
      `run ${id.slice(0, 8)}: ${oldKeys.filter((k, i) => k !== nextKeys[i]).length}/${oldKeys.length} keys`
    );
    if (write) {
      meta.finding_keys = nextKeys;
      await patchById(rest, "review_runs", id, { meta });
    }
  }
  return stats;
}

function printStats(label: string, stats: TableStats): void {
  console.log(`\n=== ${label} ===`);
  console.log({
    scanned: stats.scanned,
    would_change: stats.changed,
    ...(stats.merged != null ? { would_merge: stats.merged } : {}),
    ...(stats.skipped != null ? { skipped: stats.skipped } : {}),
  });
  for (const s of stats.samples) console.log(`  ${s}`);
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
      console.error(
        "Cloud: defina SUPABASE_CLOUD_URL e SUPABASE_CLOUD_SECRET_KEY no .env"
      );
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
  const config = loadConfig({ env, projectSlug: slug });
  const store = new ReviewStore(config);
  const rest = store as unknown as SupabaseRest;
  const projectId = await store.getProjectId();
  const runIds = await listRunIds(rest, projectId);

  console.log(
    `=== backfill finding_keys (${args.cloud ? "cloud" : "local"}) ${
      args.write ? "WRITE" : "dry-run"
    } slug=${slug} ===`
  );
  console.log({ project_id: projectId, runs: runIds.length });

  const map = await buildAliasMap(rest, projectId, runIds);
  console.log({ alias_map_size: map.size });

  printStats(
    "decisions",
    await backfillDecisions(rest, projectId, args.write, map)
  );
  printStats("findings", await backfillFindings(rest, runIds, args.write, map));
  printStats(
    "exclusions",
    await backfillExclusions(rest, projectId, args.write, map)
  );
  printStats(
    "conventions (+ meta.absorbed_finding_keys)",
    await backfillConventions(rest, projectId, args.write, map)
  );
  printStats(
    "review_runs.meta.finding_keys",
    await backfillRunMeta(rest, projectId, args.write, map)
  );

  if (!args.write) {
    console.log(
      "\nDry-run. Use --write para aplicar. Depois --promote para reconcile."
    );
    return 0;
  }

  if (args.promote) {
    console.log("\n=== reconcile conventions ===");
    console.log(
      await reconcileConventionsWithLlm({
        port: store,
        projectId,
        inferScope: inferScopeFromFile,
        env,
        source: "backfill-finding-keys",
        packageRoot: path.resolve(__dirname, ".."),
      })
    );
  } else {
    console.log("\nWrite ok.");
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
