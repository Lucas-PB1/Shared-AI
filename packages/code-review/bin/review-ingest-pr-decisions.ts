#!/usr/bin/env node
/**
 * Ingere decisões de review a partir de um PR mergeado.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyThread,
  parseRepo,
  resolvePrCommitRange,
  upsertPrDecisions,
} from "../src/ingest-decisions.js";
import {
  DECISIONS_INGEST_FILE,
  buildContext,
  cmdPromover,
  decisionsIngestPath,
  readDecisions,
  reviewDir,
  writeContext,
} from "../src/memoria.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.resolve(__dirname, "../tools");

function runGh(args: string[]): unknown {
  const proc = spawnSync("gh", args, {
    encoding: "utf8",
  });
  if (proc.status !== 0) {
    throw new Error(proc.stderr || `gh failed: ${args.join(" ")}`);
  }
  return JSON.parse(proc.stdout || "null");
}

function fetchPrThreads(
  owner: string,
  repo: string,
  prNumber: number
): Record<string, unknown> {
  const query = `
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      merged
      mergedAt
      baseRefOid
      headRefOid
      mergeCommit { oid }
      title
      reviewThreads(first: 100) {
        nodes {
          isResolved
          comments(first: 30) {
            nodes {
              body
              path
              line
              originalLine
              author { login }
              commit { oid }
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
    console.error(`PR #${prNumber} não encontrado em ${owner}/${repo}`);
    process.exit(1);
  }
  return pr;
}

function runExportExclusions(project: string): void {
  const script = path.join(toolsDir, "review-export-exclusions.sh");
  const proc = spawnSync("bash", [script, project], { encoding: "utf8" });
  if (proc.status !== 0) {
    throw new Error(proc.stderr || "review-export-exclusions.sh falhou");
  }
}

function cmdIngest(
  project: string,
  prNumber: number,
  repository: string,
  write: boolean,
  promoteAll: boolean
): number {
  let owner: string;
  let repo: string;
  try {
    [owner, repo] = parseRepo(repository);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const pr = fetchPrThreads(owner, repo, prNumber);

  if (!pr.merged) {
    console.log(`PR #${prNumber} não foi mergeado — nada a ingerir.`);
    return 0;
  }

  const mergeOid =
    ((pr.mergeCommit as { oid?: string } | null)?.oid as string) || "";
  const [baseOid, headOid] = resolvePrCommitRange(project, pr, mergeOid);
  const threads =
    (
      (pr.reviewThreads as { nodes?: unknown[] } | null)?.nodes as Array<{
        isResolved?: boolean;
        comments?: { nodes?: unknown[] };
      }>
    ) ?? [];

  const proposed: Array<Record<string, unknown>> = [];
  for (const thread of threads) {
    const decision = classifyThread(
      thread as Parameters<typeof classifyThread>[0],
      true,
      mergeOid,
      baseOid,
      headOid,
      project,
      prNumber
    );
    if (decision) proposed.push(decision);
  }

  console.log(`=== ingest PR #${prNumber} (${owner}/${repo}) ===`);
  console.log(`Merge: ${mergeOid ? mergeOid.slice(0, 7) : "?"}`);
  console.log(`Threads /avaliar: ${proposed.length} decisão(ões) proposta(s)`);
  console.log("");

  for (const d of proposed) {
    console.log(
      `  [${d.decision}] ${d.file || "?"}:${d.line} — ${String(d.summary ?? "").slice(0, 70)}`
    );
  }

  if (!proposed.length) {
    console.log("\nNenhuma decisão nova.");
    return 0;
  }

  if (!write) {
    console.log(
      "\nDry-run. Use --write para gravar decisions + compactar + promover + export."
    );
    return 0;
  }

  const rd = reviewDir(project);
  mkdirSync(rd, { recursive: true });
  const version = path.join(rd, ".memoria-version");
  if (!existsSync(version)) writeFileSync(version, "2\n", "utf8");

  const decisionsPath = decisionsIngestPath(project);
  const added = upsertPrDecisions(decisionsPath, prNumber, proposed);
  console.log(
    `\n${added.length} decisão(ões) gravada(s) em ${DECISIONS_INGEST_FILE} (source github-pr-${prNumber})`
  );

  const allDecisions = readDecisions(decisionsPath);
  const context = buildContext(
    project,
    `github-pr-${prNumber}`,
    allDecisions
  );
  writeContext(rd, context);
  console.log("context.yaml atualizado");

  cmdPromover(project, true, promoteAll);

  runExportExclusions(project);
  console.log("exclusions.yaml exportado");
  console.log(
    "\nPróximo: commit .cursor/review/decisions-ingest.jsonl + convencoes.md + exclusions.yaml"
  );
  return 0;
}

function main(): number {
  const argv = process.argv.slice(2);
  let project = ".";
  let write = false;
  let promoteAll = false;
  let repo = "";
  let prNumber: number | null = null;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project" && argv[i + 1]) {
      project = argv[++i];
    } else if (a === "--repo" && argv[i + 1]) {
      repo = argv[++i];
    } else if (a === "--write") {
      write = true;
    } else if (a === "--all") {
      promoteAll = true;
    } else if (/^\d+$/.test(a)) {
      prNumber = Number.parseInt(a, 10);
    }
  }

  if (prNumber === null) {
    console.error(
      "Uso: review-ingest-pr-decisions <pr_number> [--project DIR] [--repo owner/name] [--write] [--all]"
    );
    return 1;
  }

  const resolved = path.resolve(project);
  let repository = repo.trim();
  if (!repository) {
    const proc = spawnSync(
      "gh",
      ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
      { cwd: resolved, encoding: "utf8" }
    );
    if (proc.status !== 0) {
      console.error(proc.stderr || "gh repo view falhou");
      return 1;
    }
    repository = (proc.stdout ?? "").trim();
  }

  return cmdIngest(resolved, prNumber, repository, write, promoteAll);
}

try {
  process.exit(main());
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
