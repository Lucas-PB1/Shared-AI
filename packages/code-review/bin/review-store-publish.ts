#!/usr/bin/env tsx
/**
 * U2 — publica review_run + findings a partir de relatórios /avaliar.
 * Soft se store offline; hard se REVIEW_STORE_REQUIRED=1.
 *
 * Uso:
 *   review-store-publish.ts --project PATH [--reports DIR] [--pr N] [--sha SHA]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractReportFilePath,
  parseFindingsFromReport,
} from "../src/report/index.js";
import {
  loadDotenvFile,
  logPublishResult,
  publishRun,
  type CreateFindingFields,
} from "../src/store/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");

function parseArgs(argv: string[]): {
  project: string;
  reports: string;
  pr?: number;
  sha?: string;
  branch?: string;
  source: string;
  slug?: string;
} {
  let project = ".";
  let reports = "";
  let pr: number | undefined;
  let sha: string | undefined;
  let branch: string | undefined;
  let source = "ci";
  let slug: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project" && argv[i + 1]) project = argv[++i];
    else if (a === "--reports" && argv[i + 1]) reports = argv[++i];
    else if (a === "--pr" && argv[i + 1]) pr = Number.parseInt(argv[++i], 10);
    else if (a === "--sha" && argv[i + 1]) sha = argv[++i];
    else if (a === "--branch" && argv[i + 1]) branch = argv[++i];
    else if (a === "--source" && argv[i + 1]) source = argv[++i];
    else if (a === "--slug" && argv[i + 1]) slug = argv[++i];
    else if (!a.startsWith("-")) project = a;
  }
  return { project, reports, pr, sha, branch, source, slug };
}

function collectFindings(reportsDir: string): CreateFindingFields[] {
  if (!fs.existsSync(reportsDir)) return [];
  const files = fs
    .readdirSync(reportsDir)
    .filter((n) => n.endsWith(".md") && !n.startsWith("diff-"))
    .map((n) => path.join(reportsDir, n));

  const out: CreateFindingFields[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    const md = fs.readFileSync(f, "utf8");
    const defaultFile = extractReportFilePath(md);
    for (const p of parseFindingsFromReport(md, defaultFile)) {
      const key = `${p.findingKey}|${p.filePath ?? ""}|${p.lineStart ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        findingKey: p.findingKey,
        summary: p.summary,
        filePath: p.filePath,
        lineStart: p.lineStart,
        body: p.body,
        deCode: p.deCode,
        paraCode: p.paraCode,
        category: "avaliar",
        meta: { report: path.basename(f) },
      });
    }
  }
  return out;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const project = path.resolve(args.project);
  for (const p of [
    path.join(project, ".env"),
    path.join(monorepoRoot, ".env"),
  ]) {
    await loadDotenvFile(p);
  }

  const reportsDir = args.reports
    ? path.resolve(args.reports)
    : path.join(project, ".cursor/review/reports");

  const findings = collectFindings(reportsDir);
  const envPr =
    args.pr ??
    (process.env.PR_NUMBER
      ? Number.parseInt(process.env.PR_NUMBER, 10)
      : undefined);
  const sha =
    args.sha ??
    process.env.HEAD_SHA ??
    process.env.CI_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    null;
  const branch = args.branch ?? process.env.GITHUB_REF_NAME ?? null;

  const result = await publishRun(findings, {
    projectSlug: args.slug,
    run: {
      source: args.source,
      actorKind: "tool",
      actorRef: "review-store-publish",
      gitSha: sha,
      branch,
      prNumber:
        envPr != null && Number.isFinite(envPr) && envPr > 0 ? envPr : null,
      reviewSlug: envPr ? `pr-${envPr}` : "ci-publish",
      meta: {
        reports_dir: reportsDir,
        report_files: findings.length,
      },
    },
  });
  logPublishResult("review-store-publish", result);
  console.log(
    JSON.stringify(
      {
        ok: !result.error,
        attempted: result.attempted,
        run_id: result.runId ?? null,
        findings: result.findings,
        scanned: findings.length,
        error: result.error ?? null,
        reports: reportsDir,
      },
      null,
      2
    )
  );

  if (!result.attempted) return 0;
  return result.error ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
