#!/usr/bin/env tsx
/**
 * U2 — publica review_run + findings a partir de relatórios /avaliar.
 * Store obrigatório.
 *
 * Uso:
 *   review-store-publish.ts --project PATH [--reports DIR] [--pr N] [--sha SHA]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractReportFilePath,
  extractReportVerdict,
  parseFindingsFromReport,
} from "../src/report/index.js";
import { reviewWorkDir } from "../src/memory/paths.js";
import {
  loadDotenvFile,
  logPublishResult,
  publishRun,
  type CreateFindingFields,
  type ReportScanEntry,
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

function scanReports(reportsDir: string): {
  findings: CreateFindingFields[];
  reports: ReportScanEntry[];
} {
  if (!fs.existsSync(reportsDir)) {
    return { findings: [], reports: [] };
  }
  const files = fs
    .readdirSync(reportsDir)
    .filter((n) => n.endsWith(".md") && !n.startsWith("diff-"))
    .map((n) => path.join(reportsDir, n))
    .sort();

  const out: CreateFindingFields[] = [];
  const scans: ReportScanEntry[] = [];
  const seen = new Set<string>();

  for (const f of files) {
    const md = fs.readFileSync(f, "utf8");
    const defaultFile = extractReportFilePath(md);
    const verdict = extractReportVerdict(md);
    const basename = path.basename(f);
    let findingCount = 0;

    for (const p of parseFindingsFromReport(md, defaultFile)) {
      const key = `${p.findingKey}|${p.filePath ?? ""}|${p.lineStart ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findingCount += 1;
      out.push({
        findingKey: p.findingKey,
        summary: p.summary,
        filePath: p.filePath,
        lineStart: p.lineStart,
        body: p.body,
        deCode: p.deCode,
        paraCode: p.paraCode,
        severity: p.severity,
        category: p.category ?? "avaliar",
        meta: {
          report: basename,
          has_de: Boolean(p.deCode),
          has_para: Boolean(p.paraCode),
        },
      });
    }

    scans.push({
      report: basename,
      file: defaultFile,
      verdict,
      findings: findingCount,
    });
  }
  return { findings: out, reports: scans };
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
    : path.join(reviewWorkDir(project), "reports");

  const { findings, reports } = scanReports(reportsDir);
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
    reports,
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
        reports_scanned: reports.length,
        files_reviewed: [
          ...new Set(
            reports
              .map((r) => r.file)
              .filter((p): p is string => Boolean(p && p.trim()))
          ),
        ],
        error: result.error ?? null,
        reports: reportsDir,
      },
      null,
      2
    )
  );

  if (result.error) return 1;
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
