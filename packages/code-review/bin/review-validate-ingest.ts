#!/usr/bin/env node
/**
 * Valida estado do store + candidatos a promote (ingest).
 * Uso: npx tsx packages/code-review/bin/review-validate-ingest.ts [--slug SLUG]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONVENTION_PROMOTE_THRESHOLD,
  ReviewStore,
  absorbedFindingKeysFromMeta,
  findCoveringConvention,
  loadConfig,
  loadDotenvFile,
  rowToExistingConvention,
} from "../src/store/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");

function parseArgs(argv: string[]): { slug?: string } {
  const out: { slug?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--slug" && argv[i + 1]) out.slug = argv[++i];
  }
  return out;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  await loadDotenvFile(path.join(process.cwd(), ".env"));
  await loadDotenvFile(path.join(monorepoRoot, ".env"));

  const cfg = loadConfig({ projectSlug: args.slug });
  const store = new ReviewStore(cfg);
  const projectId = await store.getProjectId();

  console.log("=== store ===");
  console.log({ project_slug: cfg.projectSlug, project_id: projectId });

  const decisions = await store.listDecisions(projectId, { limit: 500 });
  const exclusions = await store.listExclusions(projectId, {
    activeOnly: false,
    limit: 500,
  });
  const conventions = await store.listConventions(projectId, { limit: 500 });

  const byVerdict: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const aceitoByKey = new Map<
    string,
    { n: number; summary: string; files: Set<string> }
  >();

  for (const d of decisions) {
    const v = String(d.verdict ?? "?");
    byVerdict[v] = (byVerdict[v] ?? 0) + 1;
    const src = String(d.source ?? "(null)");
    bySource[src] = (bySource[src] ?? 0) + 1;
    if (v !== "aceito") continue;
    const k = String(d.finding_key ?? "");
    if (!k) continue;
    const cur = aceitoByKey.get(k) ?? {
      n: 0,
      summary: String(d.summary ?? k),
      files: new Set<string>(),
    };
    cur.n += 1;
    if (d.file_path) cur.files.add(String(d.file_path));
    if (d.summary) cur.summary = String(d.summary);
    aceitoByKey.set(k, cur);
  }

  console.log("\n=== counts ===");
  console.log({
    decisions: decisions.length,
    exclusions: exclusions.length,
    conventions: conventions.length,
    byVerdict,
    distinct_sources: Object.keys(bySource).length,
  });

  console.log("\n=== top sources ===");
  for (const [src, n] of Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)) {
    console.log(`  ${n}\t${src}`);
  }

  console.log("\n=== conventions (DB) ===");
  if (!conventions.length) {
    console.log("  (nenhuma)");
  }
  for (const c of conventions) {
    const meta = c.meta;
    console.log(
      JSON.stringify({
        id: String(c.id ?? "").slice(0, 8),
        finding_key: c.finding_key,
        occurrences: c.occurrences,
        scope: c.scope_glob,
        source: c.source,
        absorbed: absorbedFindingKeysFromMeta(meta),
        evidence_count:
          meta && typeof meta === "object" && !Array.isArray(meta)
            ? (meta as Record<string, unknown>).evidence_count ?? null
            : null,
        evidence_decision_ids:
          meta && typeof meta === "object" && !Array.isArray(meta)
            ? (meta as Record<string, unknown>).evidence_decision_ids ?? null
            : null,
        related_prs:
          meta && typeof meta === "object" && !Array.isArray(meta)
            ? (meta as Record<string, unknown>).related_prs ?? null
            : null,
        superseded_by:
          meta && typeof meta === "object" && !Array.isArray(meta)
            ? (meta as Record<string, unknown>).superseded_by ?? null
            : null,
        body: String(c.body ?? "").slice(0, 100),
      })
    );
  }

  const existing = conventions
    .map(rowToExistingConvention)
    .filter((c): c is NonNullable<typeof c> => c != null);

  const ready = [...aceitoByKey.entries()]
    .filter(([, x]) => x.n >= CONVENTION_PROMOTE_THRESHOLD)
    .sort((a, b) => b[1].n - a[1].n);
  const singles = [...aceitoByKey.entries()].filter(([, x]) => x.n === 1);

  console.log("\n=== aceito ≥2 (ingest promote: create|merge|bump) ===");
  let covered = 0;
  let uncovered = 0;
  for (const [k, x] of ready) {
    const match = findCoveringConvention(existing, k);
    if (match) covered += 1;
    else uncovered += 1;
    console.log(
      JSON.stringify({
        finding_key: k,
        aceitos: x.n,
        status: match ? `bump→${match.id.slice(0, 8)}` : "needs_promote",
        summary: x.summary.slice(0, 80),
        files: [...x.files].slice(0, 3),
      })
    );
  }
  console.log({
    ready: ready.length,
    already_covered: covered,
    needs_promote: uncovered,
    single_aceito: singles.length,
    threshold: CONVENTION_PROMOTE_THRESHOLD,
  });

  const activeEx = exclusions.filter((e) => e.active !== false);
  console.log("\n=== exclusions ativas (amostra) ===");
  for (const e of activeEx.slice(0, 20)) {
    console.log(
      JSON.stringify({
        finding_key: e.finding_key,
        scope: e.scope_glob,
        occurrences: e.occurrences,
        reason: String(e.reason ?? "").slice(0, 90),
      })
    );
  }
  console.log({ active_exclusions: activeEx.length });

  const githubSources = Object.keys(bySource).filter((s) =>
    s.startsWith("github-pr-")
  );
  console.log("\n=== ingest CI sources ===");
  console.log({
    github_pr_sources: githubSources.length,
    sample: githubSources.slice(0, 10),
  });

  console.log("\nok — validação leitura store concluída");
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
