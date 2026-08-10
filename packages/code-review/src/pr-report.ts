/**
 * Funções puras do /avaliar em PR: veredito, prioridade do resumo, markers, snippets.
 */

import { stableFindingId } from "./finding-ids.js";
import {
  DE_LABEL,
  INLINE_DE_SCORE,
  INLINE_PARA_SCORE,
  PARA_LABEL,
  PT_SUMMARY_LABEL,
  buildInlineMarkerHtml,
} from "./markers.js";
import { codeSnippetsMatch, normalizeCodeSnippet } from "./snippets.js";

export { codeSnippetsMatch, normalizeCodeSnippet };

export const VERDICT_OK = "OK";
export const VERDICT_NOT_RECOMMENDED = "Não recomendado";
export const VERDICT_NEEDS_CHANGES = "Ajustes necessários";

const RE_VERDICT_OK = new RegExp(
  `^\\*\\*Veredito:\\*\\*\\s*${VERDICT_OK}\\s*$`,
  "m"
);
const RE_VERDICT_BAD = /^\*\*Veredito:\*\*\s*N[aã]o recomendado/im;
const RE_VERDICT_AJUSTES = new RegExp(
  `^\\*\\*Veredito:\\*\\*\\s*${VERDICT_NEEDS_CHANGES}`,
  "im"
);
const RE_IMPEDITIVO = /^### Impeditivo/m;
const RE_BLOCK_HEADING = /^####\s+(.+)$/m;

export type SummaryRow = {
  action: string;
  file: string;
  verdict: string;
  inlineCount: number;
  blocking: number;
};

export function parseVerdict(report: string): string {
  if (RE_VERDICT_OK.test(report)) return VERDICT_OK;
  if (RE_VERDICT_BAD.test(report)) return VERDICT_NOT_RECOMMENDED;
  if (RE_VERDICT_AJUSTES.test(report)) return VERDICT_NEEDS_CHANGES;
  return VERDICT_NEEDS_CHANGES;
}

export function verdictIsFailure(verdict: string): boolean {
  return verdict !== VERDICT_OK;
}

export function reportHasImpeditivo(report: string): boolean {
  if (RE_IMPEDITIVO.test(report)) return true;
  return parseVerdict(report) === VERDICT_NOT_RECOMMENDED;
}

export function extractBlockTitle(block: string): string {
  const match = RE_BLOCK_HEADING.exec(block);
  if (!match) return "";
  return match[1].trim();
}

export function extractPtSummary(block: string): string {
  let found = false;
  for (const line of block.split(/\r?\n/)) {
    if (line.trim().startsWith(PT_SUMMARY_LABEL)) {
      found = true;
      continue;
    }
    if (!found) continue;
    const m = /^>\s?(.*)$/.exec(line);
    if (m) return m[1].trim();
    if (line.trim().startsWith("**") || line.startsWith("####")) break;
  }
  return "";
}

export function buildInlineMarker(
  filePath: string,
  startLine: number | string,
  title: string
): string {
  return buildInlineMarkerHtml(filePath, startLine, stableFindingId(title));
}

export function inlineBlockScore(block: string): number {
  let score = 0;
  if (block.includes(DE_LABEL)) score += INLINE_DE_SCORE;
  if (block.includes(PARA_LABEL)) score += INLINE_PARA_SCORE;
  return score;
}

export function fileRowPriority(
  action: string,
  verdict: string,
  inlineCount: number,
  blocking: number
): [number, string] {
  if (action === "skip") {
    return [4, "⏭ pulado (já revisado neste head)"];
  }
  if (blocking > 0) return [1, "🛑 impeditivo"];
  if (inlineCount > 0) return [2, `💬 ${inlineCount} comentário(s) inline`];
  if (verdictIsFailure(verdict)) return [2, "⚠️ achado (sem inline acionável)"];
  return [3, "✅ revisado"];
}

export function parseFilesLogLine(line: string): SummaryRow | null {
  const parts = line.replace(/\n$/, "").split("\t");
  if (parts.length < 2) return null;
  const action = parts[0];
  const filePath = parts[1];
  if (!filePath) return null;
  const verdict = parts.length > 2 ? parts[2] : "—";
  let inlineCount = 0;
  let blocking = 0;
  if (parts.length > 3) {
    const n = Number.parseInt(parts[3], 10);
    inlineCount = Number.isFinite(n) ? n : 0;
  }
  if (parts.length > 4) {
    const n = Number.parseInt(parts[4], 10);
    blocking = Number.isFinite(n) ? n : 0;
  }
  return { action, file: filePath, verdict, inlineCount, blocking };
}

export function formatSummaryTable(
  logText: string
): [string, Record<string, number>] {
  const rows: Array<[number, string, string]> = [];
  const stats = {
    reviewed: 0,
    skipped: 0,
    failed: 0,
    inline_this_run: 0,
    blocking_this_run: 0,
  };

  for (const line of logText.split(/\r?\n/)) {
    const row = parseFilesLogLine(line);
    if (row === null) continue;
    if (row.action === "review") {
      stats.reviewed += 1;
      stats.inline_this_run += row.inlineCount;
      stats.blocking_this_run += row.blocking;
      if (verdictIsFailure(row.verdict)) stats.failed += 1;
      const [priority, icon] = fileRowPriority(
        row.action,
        row.verdict,
        row.inlineCount,
        row.blocking
      );
      const md = `| \`${row.file}\` | ${icon} | ${row.verdict || "—"} |`;
      rows.push([priority, row.file, md]);
    } else if (row.action === "skip") {
      stats.skipped += 1;
      const [priority, icon] = fileRowPriority(row.action, "—", 0, 0);
      const md = `| \`${row.file}\` | ${icon} | — |`;
      rows.push([priority, row.file, md]);
    }
  }

  rows.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
  let table = rows.map((r) => r[2]).join("\n");
  if (table) table += "\n";
  return [table, stats];
}

export function buildInlineCommentBody(block: string): string {
  const title = extractBlockTitle(block);
  if (!title) return "";
  const summary = extractPtSummary(block);
  if (summary) return `${title}\n\n${summary}`;
  return title;
}
