#!/usr/bin/env node
/**
 * Backfill oficial via GitHub GraphQL: autor, revisores, branch e git_sha.
 * Schema tipado vive na migration; este comando busca o que a SQL não alcança.
 *
 * Uso:
 *   npm run review:backfill-pr-people -- --cloud [--write] [--force] [--slug hostdime-hub]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractPrParticipants,
  isBotLogin,
  type PrParticipants,
} from "../src/ingest/participants.js";
import {
  StoreError,
  loadConfig,
  loadDotenvFile,
  ReviewStore,
} from "../src/store/index.js";
import type { SupabaseRest } from "../src/store/supabase-rest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  github_owner: string | null;
  github_repo: string | null;
};

type RunRow = {
  id: string;
  project_id: string;
  pr_number: number | null;
  review_slug: string | null;
  branch: string | null;
  git_sha: string | null;
  pr_author: string | null;
  reviewers: string[] | null;
  meta: Record<string, unknown> | null;
};

type PrGitMeta = PrParticipants & {
  threadReviewers: string[];
  branch: string | null;
  git_sha: string | null;
  head_sha: string | null;
  merge_sha: string | null;
};

function parseArgs(argv: string[]) {
  let write = false;
  let cloud = false;
  let slug: string | null = null;
  let force = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") write = true;
    else if (a === "--cloud") cloud = true;
    else if (a === "--force") force = true;
    else if (a === "--slug" && argv[i + 1]) slug = argv[++i];
  }
  return { write, cloud, slug, force };
}

function runGh(args: string[]): unknown {
  const proc = spawnSync("gh", args, { encoding: "utf8" });
  if (proc.status !== 0) {
    throw new Error(proc.stderr || `gh failed: ${args.join(" ")}`);
  }
  return JSON.parse(proc.stdout || "null");
}

function fetchPrMeta(
  owner: string,
  repo: string,
  prNumber: number
): PrGitMeta {
  const query = `
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      author { login }
      headRefName
      headRefOid
      mergeCommit { oid }
      reviews(first: 100) {
        nodes {
          state
          author { login }
        }
      }
      reviewThreads(first: 100) {
        nodes {
          comments(first: 30) {
            nodes {
              author { login }
            }
          }
        }
      }
    }
  }
}
`;
  const data = runGh([
    "api",
    "graphql",
    "-f",
    `query=${query}`,
    "-f",
    `owner=${owner}`,
    "-f",
    `repo=${repo}`,
    "-F",
    `number=${prNumber}`,
  ]) as {
    data?: { repository?: { pullRequest?: Record<string, unknown> } };
  };
  const pr = data?.data?.repository?.pullRequest;
  if (!pr) {
    throw new Error(`PR #${prNumber} não encontrado em ${owner}/${repo}`);
  }

  const base = extractPrParticipants(pr);
  const threadReviewers = new Set<string>(base.reviewers);
  const threads =
    (
      (pr.reviewThreads as { nodes?: Array<Record<string, unknown>> } | null)
        ?.nodes as Array<Record<string, unknown>> | undefined
    ) ?? [];

  for (const thread of threads) {
    const comments =
      (
        (thread.comments as { nodes?: Array<Record<string, unknown>> } | null)
          ?.nodes as Array<Record<string, unknown>> | undefined
      ) ?? [];
    for (const comment of comments) {
      const login =
        ((comment.author as { login?: string } | null)?.login ?? "").trim();
      if (login && !isBotLogin(login)) threadReviewers.add(login);
    }
  }

  if (base.pr_author) threadReviewers.delete(base.pr_author);

  const headSha = String(pr.headRefOid ?? "").trim() || null;
  const mergeSha =
    ((pr.mergeCommit as { oid?: string } | null)?.oid as string)?.trim() ||
    null;

  return {
    ...base,
    reviewers: [...threadReviewers].sort((a, b) => a.localeCompare(b)),
    threadReviewers: [...threadReviewers],
    branch: String(pr.headRefName ?? "").trim() || null,
    git_sha: headSha || mergeSha,
    head_sha: headSha,
    merge_sha: mergeSha,
  };
}

async function listProjects(
  rest: SupabaseRest,
  slug: string | null
): Promise<ProjectRow[]> {
  const q = new URLSearchParams({
    select: "id,slug,name,github_owner,github_repo",
    order: "slug",
  });
  if (slug) q.set("slug", `eq.${slug}`);
  const url = `${rest.config.restBase}/projects?${q}`;
  return (await rest.request("GET", url, rest.headers())) as ProjectRow[];
}

async function listRunsWithPr(
  rest: SupabaseRest,
  projectId: string
): Promise<RunRow[]> {
  const q = new URLSearchParams({
    select:
      "id,project_id,pr_number,review_slug,branch,git_sha,pr_author,reviewers,meta",
    project_id: `eq.${projectId}`,
    pr_number: "not.is.null",
    order: "started_at.desc",
    limit: "200",
  });
  const url = `${rest.config.restBase}/review_runs?${q}`;
  return (await rest.request("GET", url, rest.headers())) as RunRow[];
}

async function patchRunMeta(
  rest: SupabaseRest,
  runId: string,
  patch: {
    pr_author: string | null;
    pr_author_is_bot: boolean;
    reviewers: string[];
    branch: string | null;
    git_sha: string | null;
    reviews: unknown;
    head_sha: string | null;
    merge_sha: string | null;
    meta: Record<string, unknown>;
  }
): Promise<void> {
  const q = new URLSearchParams({ id: `eq.${runId}` });
  const url = `${rest.config.restBase}/review_runs?${q}`;
  const nextMeta = {
    ...patch.meta,
    pr_author: patch.pr_author,
    pr_author_is_bot: patch.pr_author_is_bot,
    reviewers: patch.reviewers,
    reviews: patch.reviews,
    head_sha: patch.head_sha,
    merge_sha: patch.merge_sha,
    people_backfilled_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
  await rest.request(
    "PATCH",
    url,
    rest.headers({ prefer: "return=minimal" }),
    {
      pr_author: patch.pr_author,
      pr_author_is_bot: patch.pr_author_is_bot,
      reviewers: patch.reviewers,
      branch: patch.branch,
      git_sha: patch.git_sha,
      meta: nextMeta,
    }
  );
}

function needsBackfill(run: RunRow, force: boolean): boolean {
  if (force) return true;
  const author = (run.pr_author ?? run.meta?.pr_author ?? "").toString().trim();
  const reviewers = Array.isArray(run.reviewers)
    ? run.reviewers
    : Array.isArray(run.meta?.reviewers)
      ? (run.meta?.reviewers as string[])
      : [];
  const branch = (run.branch ?? "").trim();
  const sha = (run.git_sha ?? "").trim();
  return !author || reviewers.length === 0 || !branch || !sha;
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
  }

  const config = loadConfig({ env, projectSlug: args.slug ?? "hostdime-ia" });
  const store = new ReviewStore(config);
  const rest = store as unknown as SupabaseRest;

  console.log(
    `=== backfill PR meta (${args.cloud ? "cloud" : "env ativo"}) ${
      args.write ? "WRITE" : "dry-run"
    } ===`
  );

  const projects = await listProjects(rest, args.slug);
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const project of projects) {
    if (!project.github_owner || !project.github_repo) {
      console.log(`\n[${project.slug}] sem github_owner/repo — pulando`);
      continue;
    }

    const runs = await listRunsWithPr(rest, project.id);
    if (!runs.length) {
      console.log(`\n[${project.slug}] nenhum run com pr_number`);
      continue;
    }

    console.log(
      `\n[${project.slug}] ${runs.length} run(s) com PR · ${project.github_owner}/${project.github_repo}`
    );

    const cache = new Map<number, PrGitMeta>();

    for (const run of runs) {
      const prNumber = run.pr_number;
      if (!prNumber) continue;

      if (!needsBackfill(run, args.force)) {
        console.log(
          `  PR #${prNumber} run=${run.id.slice(0, 8)} completo — skip`
        );
        skipped += 1;
        continue;
      }

      try {
        let meta = cache.get(prNumber);
        if (!meta) {
          meta = fetchPrMeta(
            project.github_owner,
            project.github_repo,
            prNumber
          );
          cache.set(prNumber, meta);
        }

        console.log(
          `  PR #${prNumber} branch=${meta.branch ?? "?"} sha=${
            meta.git_sha ? meta.git_sha.slice(0, 7) : "?"
          } autor=@${meta.pr_author ?? "?"} revisores=[${meta.reviewers.join(", ")}]`
        );

        if (args.write) {
          await patchRunMeta(rest, run.id, {
            pr_author: meta.pr_author,
            pr_author_is_bot: meta.pr_author_is_bot,
            reviewers: meta.reviewers,
            branch: meta.branch,
            git_sha: meta.git_sha,
            reviews: meta.reviews,
            head_sha: meta.head_sha,
            merge_sha: meta.merge_sha,
            meta: run.meta ?? {},
          });
          updated += 1;
        } else {
          updated += 1;
        }
      } catch (err) {
        failed += 1;
        console.error(
          `  PR #${prNumber} falhou: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }

  console.log(
    `\nResumo: ${args.write ? "atualizados" : "candidatos"}=${updated} skip=${skipped} fail=${failed}`
  );
  if (!args.write && updated > 0) {
    console.log("Dry-run. Rode de novo com --write para gravar no store.");
  }
  return failed > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof StoreError ? err.message : err);
    process.exit(1);
  }
);
