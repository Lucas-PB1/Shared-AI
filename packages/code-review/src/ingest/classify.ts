/**
 * Classifica thread de review PR → decision (aceito/rejeitado/nao-aplicavel).
 *
 * Aceita:
 * - threads do `/avaliar` (root com marker `avaliar-inline`)
 * - threads de review humano top-level (root humano, sem marker)
 *
 * Persiste atribuição: root (bot vs humano), replies e quem decidiu.
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
import { isBotLogin } from "./participants.js";

const REJECT_PATTERNS =
  /intencional|won'?t fix|wont fix|n[aã]o se aplica|nao se aplica|false positive|falso positivo|pode ignorar|ignorar|rejeit|decline|deixa assim|sem necessidade|n[aã]o precisa|nao precisa|descart/i;
const NAO_APLICAVEL_PATTERNS =
  /s[oó] preview|so preview|s[oó] editor|so editor|edge case|raro no preview|n[aã]o afeta produ|nao afeta produ|fora do escopo/i;

const COMMENT_BODY_MAX = 800;

type ThreadNode = {
  body?: string;
  path?: string;
  line?: number | null;
  originalLine?: number | null;
  author?: { login?: string };
};

export type ThreadCommentMeta = {
  login: string;
  is_bot: boolean;
  kind: "bot" | "human";
  role: "root" | "reply";
  body: string;
};

function serializeComments(nodes: ThreadNode[]): ThreadCommentMeta[] {
  return nodes.map((node, index) => {
    const login = (node.author?.login ?? "").trim() || "unknown";
    const bot = isBotLogin(login);
    return {
      login,
      is_bot: bot,
      kind: bot ? "bot" : "human",
      role: index === 0 ? "root" : "reply",
      body: (node.body ?? "").trim().slice(0, COMMENT_BODY_MAX),
    };
  });
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
  const rootLogin = (root.author?.login ?? "").trim() || null;
  const rootIsBot = isBotLogin(rootLogin);
  const rootIsHuman = !rootIsBot;

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

  const comments = serializeComments(nodes);
  const human = nodes.slice(1).filter((c) => !isBotLogin(c.author?.login));

  const stamp =
    opts.now ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const resolvedLine = Number.isFinite(line) && line > 0 ? line : 1;

  const rootKind: "bot" | "human" =
    hasMarker || rootIsBot ? "bot" : "human";

  const attribution = {
    root_author: rootLogin,
    root_is_bot: rootIsBot || hasMarker,
    root_kind: rootKind,
    comments,
    origin: hasMarker ? "avaliar" : "human-review",
  };

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
    ...attribution,
  };

  function withDecision(
    decision: string,
    reason: string,
    decidedByLogin: string | null,
    decidedByKind: "human" | "bot" | "auto"
  ): Record<string, unknown> {
    return {
      ...base,
      decision,
      reason,
      decided_by_login: decidedByLogin,
      decided_by_kind: decidedByKind,
    };
  }

  let humanReason = "";
  let humanLogin: string | null = null;
  for (const reply of human) {
    const text = reply.body ?? "";
    const login = (reply.author?.login ?? "").trim() || null;
    if (NAO_APLICAVEL_PATTERNS.test(text)) {
      return withDecision(
        "nao-aplicavel",
        text.trim().slice(0, 200),
        login,
        "human"
      );
    }
    if (REJECT_PATTERNS.test(text)) {
      return withDecision(
        "rejeitado",
        text.trim().slice(0, 200),
        login,
        "human"
      );
    }
    if (text.trim() && !humanReason) {
      humanReason = text.trim().slice(0, 200);
      humanLogin = login;
    }
  }

  if (human.length) {
    return withDecision(
      "aceito",
      humanReason || "resposta humana no thread (sem objeção)",
      humanLogin,
      "human"
    );
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
    return withDecision("aceito", appliedReason, null, "auto");
  }

  const fileContent =
    filePath && mergeOid ? showFile(project, mergeOid, filePath) : "";

  if (thread.isResolved && fileContent && paraCode) {
    return withDecision("aceito", "thread resolvido no PR", null, "auto");
  }

  if (thread.isResolved && !human.length) {
    return withDecision(
      "aceito",
      hasMarker
        ? "thread resolvido sem objeção"
        : "review humano resolvido sem objeção",
      rootIsHuman ? rootLogin : null,
      rootIsHuman ? "human" : "auto"
    );
  }

  return withDecision(
    "rejeitado",
    "merge sem resposta no thread — achado ignorado",
    null,
    "auto"
  );
}

export { isBotLogin } from "./participants.js";
