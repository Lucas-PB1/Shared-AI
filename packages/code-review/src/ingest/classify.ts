/**
 * Classifica thread de review PR → decision (aceito/rejeitado/nao-aplicavel).
 *
 * Aceita:
 * - threads do `/avaliar` (root com marker `avaliar-inline`)
 * - threads de review humano top-level (root humano, sem marker)
 */

import {
  extractFindingTheme,
  stableFindingId,
  INLINE_MARKER_RE,
  bodyHasInlineMarker,
} from "../shared/index.js";
import { SCHEMA_VERSION } from "../memory/index.js";
import {
  extractDeParaFromBody,
  extractSummary,
} from "./extract.js";
import { gitLogCommits, gitShow, type ListCommitsFn, type ShowFileFn } from "./git.js";
import { fixAppliedInPr } from "./fix.js";

const BOT_LOGINS = new Set([
  "github-actions",
  "github-actions[bot]",
  "dependabot[bot]",
]);

const REJECT_PATTERNS =
  /intencional|won'?t fix|wont fix|n[aã]o se aplica|nao se aplica|false positive|falso positivo|pode ignorar|ignorar|rejeit|decline|deixa assim|sem necessidade|n[aã]o precisa|nao precisa|descart/i;
const NAO_APLICAVEL_PATTERNS =
  /s[oó] preview|so preview|s[oó] editor|so editor|edge case|raro no preview|n[aã]o afeta produ|nao afeta produ|fora do escopo/i;

type ThreadNode = {
  body?: string;
  path?: string;
  line?: number | null;
  originalLine?: number | null;
  author?: { login?: string };
};

function isBotLogin(login: string | undefined): boolean {
  return Boolean(login && BOT_LOGINS.has(login));
}

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
  const hasMarker = bodyHasInlineMarker(body);
  const rootIsHuman = !isBotLogin(root.author?.login);

  // Bot sem marker (ruído) — ignora. Humano top-level sem marker — ingere.
  if (!hasMarker && !rootIsHuman) return null;
  if (!hasMarker && !body.trim()) return null;

  const marker = hasMarker ? INLINE_MARKER_RE.exec(body) : null;
  const filePath = marker ? marker[1] : root.path ?? "";
  const line = marker
    ? Number.parseInt(marker[2], 10)
    : Number(root.line ?? root.originalLine ?? 1);
  const markerFid = marker ? marker[3] ?? null : null;
  const rawSummary = extractSummary(body);
  const summary = extractFindingTheme(rawSummary);
  const [deCode, paraCode] = extractDeParaFromBody(body);

  const human = nodes.slice(1).filter((c) => !isBotLogin(c.author?.login));

  const stamp =
    opts.now ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const resolvedLine = Number.isFinite(line) && line > 0 ? line : 1;
  const base = {
    schema: SCHEMA_VERSION,
    finalized_at: stamp,
    review_slug: `pr-${prNumber}`,
    file: filePath,
    finding_id: markerFid || stableFindingId(rawSummary),
    line: resolvedLine,
    category: hasMarker ? "pr-ingest" : "pr-ingest-human",
    summary,
    source: `github-pr-${prNumber}`,
    origin: hasMarker ? "avaliar" : "human-review",
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
    line: resolvedLine,
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
      reason: hasMarker
        ? "thread resolvido sem objeção"
        : "review humano resolvido sem objeção",
    };
  }

  return {
    ...base,
    decision: "rejeitado",
    reason: "merge sem resposta no thread — achado ignorado",
  };
}
