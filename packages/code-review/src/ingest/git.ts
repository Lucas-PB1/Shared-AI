/**
 * Git helpers para ingest de PR (show, rev-list, range).
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { normalizeSnippet } from "../shared/index.js";
import { snippetInFile } from "./extract.js";

export type ShowFileFn = (
  project: string,
  sha: string,
  filePath: string
) => string;
export type ListCommitsFn = (
  project: string,
  baseOid: string,
  headOid: string
) => string[];

export function gitShow(
  project: string,
  sha: string,
  filePath: string
): string {
  const proc = spawnSync(
    "git",
    ["-C", project, "show", `${sha}:${filePath}`],
    { encoding: "utf8" }
  );
  if (proc.status !== 0) return "";
  return proc.stdout ?? "";
}

export function gitRevParse(project: string, ref: string): string {
  const proc = spawnSync("git", ["-C", project, "rev-parse", ref], {
    encoding: "utf8",
  });
  if (proc.status !== 0) return "";
  return (proc.stdout ?? "").trim();
}

export function resolvePrCommitRange(
  project: string,
  pr: Record<string, unknown>,
  mergeOid: string
): [string, string] {
  let headOid = gitRevParse(project, `${mergeOid}^2`);
  let baseOid = gitRevParse(project, `${mergeOid}^1`);
  if (headOid && baseOid) return [baseOid, headOid];

  baseOid = String(pr.baseRefOid ?? "").trim();
  headOid = String(pr.headRefOid ?? "").trim();
  if (baseOid && headOid) return [baseOid, headOid];

  return [baseOid || mergeOid, headOid || mergeOid];
}

export function gitLogCommits(
  project: string,
  baseOid: string,
  headOid: string
): string[] {
  if (!baseOid || !headOid || baseOid === headOid) {
    return headOid ? [headOid] : [];
  }
  const proc = spawnSync(
    "git",
    ["-C", project, "rev-list", "--reverse", `${baseOid}..${headOid}`],
    { encoding: "utf8" }
  );
  if (proc.status !== 0) return [];
  return (proc.stdout ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function snippetEverInCommitRange(
  project: string,
  baseOid: string,
  headOid: string,
  filePath: string,
  snippet: string,
  hintLine = 1,
  opts: { showFile?: ShowFileFn; listCommits?: ListCommitsFn } = {}
): boolean {
  const showFile = opts.showFile ?? gitShow;
  const listCommits = opts.listCommits ?? gitLogCommits;
  const norm = normalizeSnippet(snippet);
  if (!norm || !filePath) return false;
  let commits = listCommits(project, baseOid, headOid);
  if (!commits.length && headOid) commits = [headOid];
  for (const sha of commits) {
    const content = showFile(project, sha, filePath);
    if (content && snippetInFile(content, norm, hintLine)) return true;
  }
  return false;
}

export function resolveProjectPath(project: string): string {
  return path.resolve(project);
}
