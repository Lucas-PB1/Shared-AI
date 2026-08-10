/**
 * Regras puras de ingest de decisões de PR (sem gh / CLI).
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  extractFindingTheme,
  stableFindingId,
  INLINE_MARKER_RE,
  MD_DE_PARA_BLOCK,
  bodyHasInlineMarker,
  normalizeSnippet,
} from "../shared/index.js";
import {
  SCHEMA_VERSION,
  readDecisions,
  writeDecisions,
} from "../memory/index.js";

export { normalizeSnippet };

const SUGGESTION_BLOCK = /```suggestion\s*\n([\s\S]*?)```/m;
const BACKTICK_CODE = /`([^`]+)`/g;
const BOT_LOGINS = new Set([
  "github-actions",
  "github-actions[bot]",
  "dependabot[bot]",
]);

const REJECT_PATTERNS =
  /intencional|won'?t fix|wont fix|n[aã]o se aplica|nao se aplica|false positive|falso positivo|pode ignorar|ignorar|rejeit|decline|deixa assim|sem necessidade|n[aã]o precisa|nao precisa|descart/i;
const NAO_APLICAVEL_PATTERNS =
  /s[oó] preview|so preview|s[oó] editor|so editor|edge case|raro no preview|n[aã]o afeta produ|nao afeta produ|fora do escopo/i;

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

export function parseRepo(repository: string): [string, string] {
  const slash = repository.indexOf("/");
  const owner = slash >= 0 ? repository.slice(0, slash) : "";
  const name = slash >= 0 ? repository.slice(slash + 1) : "";
  if (!owner || !name) {
    throw new Error(`Repositório inválido: ${repository}`);
  }
  return [owner, name];
}

export function extractSummary(body: string): string {
  for (const line of body.split(/\r?\n/)) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith("<!--")) continue;
    return stripped.slice(0, 240);
  }
  return "achado /avaliar";
}

export function extractDeParaFromBody(body: string): [string, string] {
  let de = "";
  let para = "";
  MD_DE_PARA_BLOCK.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MD_DE_PARA_BLOCK.exec(body)) !== null) {
    const label = match[1];
    const code = match[2];
    if (label === "De") de = code;
    else para = code;
  }
  const suggestion = SUGGESTION_BLOCK.exec(body);
  if (suggestion) para = para || suggestion[1];
  return [de, para];
}

export function extractCodeIndicators(body: string): string[] {
  const indicators: string[] = [];
  BACKTICK_CODE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BACKTICK_CODE.exec(body)) !== null) {
    const token = match[1].trim();
    if (token.length < 3) continue;
    if (!indicators.includes(token)) indicators.push(token);
  }
  return indicators;
}

export function snippetInFile(
  fileContent: string,
  snippet: string,
  _hintLine = 1
): boolean {
  void _hintLine;
  const norm = normalizeSnippet(snippet);
  if (!norm) return false;
  const lines = fileContent.split(/\r?\n/);
  const parts = norm.split("\n");
  const n = parts.length;
  if (n === 0 || !lines.length) return false;
  for (let i = 0; i <= lines.length - n; i++) {
    const window = lines.slice(i, i + n).join("\n").trim();
    if (
      window === norm ||
      parts.every((p, j) => lines[i + j].includes(p))
    ) {
      return true;
    }
  }
  return fileContent.includes(norm);
}

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

export function fixAppliedInPr(
  project: string,
  args: {
    baseOid: string;
    headOid: string;
    mergeOid: string;
    filePath: string;
    line: number;
    deCode: string;
    paraCode: string;
    body: string;
    showFile?: ShowFileFn;
    listCommits?: ListCommitsFn;
  }
): [boolean, string] {
  const showFile = args.showFile ?? gitShow;
  const listCommits = args.listCommits ?? gitLogCommits;
  let fileMerge = args.mergeOid
    ? showFile(project, args.mergeOid, args.filePath)
    : "";
  if (!fileMerge && args.headOid) {
    fileMerge = showFile(project, args.headOid, args.filePath);
  }

  if (
    args.paraCode &&
    fileMerge &&
    snippetInFile(fileMerge, args.paraCode, args.line)
  ) {
    return [true, "suggestion / Para aplicada no merge"];
  }

  if (args.deCode && fileMerge) {
    if (
      !snippetInFile(fileMerge, args.deCode, args.line) &&
      snippetEverInCommitRange(
        project,
        args.baseOid,
        args.headOid,
        args.filePath,
        args.deCode,
        args.line,
        { showFile, listCommits }
      )
    ) {
      return [true, "código De removido ou corrigido no PR"];
    }
  }

  for (const indicator of extractCodeIndicators(args.body)) {
    if (fileMerge && fileMerge.includes(indicator)) continue;
    if (
      snippetEverInCommitRange(
        project,
        args.baseOid,
        args.headOid,
        args.filePath,
        indicator,
        args.line,
        { showFile, listCommits }
      )
    ) {
      return [true, `indicador \`${indicator}\` removido no PR`];
    }
  }

  return [false, ""];
}

type ThreadNode = {
  body?: string;
  path?: string;
  line?: number | null;
  originalLine?: number | null;
  author?: { login?: string };
};

export function classifyThread(
  thread: {
    isResolved?: boolean;
    comments?: { nodes?: ThreadNode[] };
  },
  merged: boolean,
  mergeOid: string,
  baseOid: string,
  headOid: string,
  project: string,
  prNumber: number,
  opts: {
    showFile?: ShowFileFn;
    listCommits?: ListCommitsFn;
    now?: string | null;
  } = {}
): Record<string, unknown> | null {
  const showFile = opts.showFile ?? gitShow;
  const listCommits = opts.listCommits ?? gitLogCommits;
  const nodes = thread.comments?.nodes ?? [];
  if (!nodes.length) return null;
  const root = nodes[0];
  const body = root.body ?? "";
  if (!bodyHasInlineMarker(body)) return null;

  const marker = INLINE_MARKER_RE.exec(body);
  const filePath = marker
    ? marker[1]
    : root.path ?? "";
  const line = marker
    ? Number.parseInt(marker[2], 10)
    : Number(root.line ?? root.originalLine ?? 1);
  const markerFid = marker ? marker[3] ?? null : null;
  const rawSummary = extractSummary(body);
  const summary = extractFindingTheme(rawSummary);
  const [deCode, paraCode] = extractDeParaFromBody(body);

  const human = nodes.slice(1).filter((c) => {
    const login = c.author?.login;
    return login ? !BOT_LOGINS.has(login) : true;
  });

  const stamp =
    opts.now ??
    new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const base = {
    schema: SCHEMA_VERSION,
    finalized_at: stamp,
    review_slug: `pr-${prNumber}`,
    file: filePath,
    finding_id: markerFid || stableFindingId(rawSummary),
    line,
    category: "pr-ingest",
    summary,
    source: `github-pr-${prNumber}`,
  };

  let humanReason = "";
  for (const reply of human) {
    const text = reply.body ?? "";
    if (NAO_APLICAVEL_PATTERNS.test(text)) {
      return {
        ...base,
        decision: "nao-aplicavel",
        reason: text.trim().slice(0, 200),
      };
    }
    if (REJECT_PATTERNS.test(text)) {
      return {
        ...base,
        decision: "rejeitado",
        reason: text.trim().slice(0, 200),
      };
    }
    if (text.trim() && !humanReason) {
      humanReason = text.trim().slice(0, 200);
    }
  }

  if (human.length) {
    return {
      ...base,
      decision: "aceito",
      reason: humanReason || "resposta humana no thread (sem objeção)",
    };
  }

  if (!merged) return null;

  const [applied, appliedReason] = fixAppliedInPr(project, {
    baseOid,
    headOid,
    mergeOid,
    filePath,
    line,
    deCode,
    paraCode,
    body,
    showFile,
    listCommits,
  });
  if (applied) {
    return {
      ...base,
      decision: "aceito",
      reason: appliedReason,
    };
  }

  const fileContent =
    filePath && mergeOid ? showFile(project, mergeOid, filePath) : "";

  if (thread.isResolved && fileContent && paraCode) {
    return {
      ...base,
      decision: "aceito",
      reason: "thread resolvido no PR",
    };
  }

  if (thread.isResolved && !human.length) {
    return {
      ...base,
      decision: "aceito",
      reason: "thread resolvido sem objeção",
    };
  }

  return {
    ...base,
    decision: "rejeitado",
    reason: "merge sem resposta no thread — achado ignorado",
  };
}

export function upsertPrDecisions(
  decisionsPath: string,
  prNumber: number,
  newItems: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const source = `github-pr-${prNumber}`;
  const existing = readDecisions(decisionsPath).filter(
    (d) => d.source !== source
  );
  const normalizedNew: Array<Record<string, unknown>> = [];
  for (const item of newItems) {
    const row = { ...item };
    const summary = String(row.summary ?? "");
    if (summary) {
      const theme = extractFindingTheme(summary);
      row.summary = theme;
      row.finding_id = stableFindingId(theme);
    }
    normalizedNew.push(row);
  }
  existing.push(...normalizedNew);
  const normalizedAll: Array<Record<string, unknown>> = [];
  for (const item of existing) {
    const row = { ...item };
    const summary = String(row.summary ?? "");
    if (summary) {
      const theme = extractFindingTheme(summary);
      row.summary = theme;
      row.finding_id = stableFindingId(theme);
    }
    normalizedAll.push(row);
  }
  writeDecisions(decisionsPath, normalizedAll);
  return normalizedNew;
}

/** @deprecated path helper only if callers need Path-like resolution */
export function resolveProjectPath(project: string): string {
  return path.resolve(project);
}
