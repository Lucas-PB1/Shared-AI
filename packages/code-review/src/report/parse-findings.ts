/**
 * Parse findings de relatórios /avaliar (markdown) para publish no store.
 */

import {
  DE_LABEL,
  INLINE_MARKER_RE,
  MD_DE_PARA_BLOCK,
  PARA_LABEL,
  extractFindingTheme,
  stableFindingId,
} from "../shared/index.js";
import { extractBlockTitle, extractPtSummary } from "./pr-report.js";

export type ParsedReportFinding = {
  findingKey: string;
  summary: string;
  filePath: string | null;
  lineStart: number | null;
  body: string | null;
  deCode: string | null;
  paraCode: string | null;
};

function extractDePara(block: string): {
  deCode: string | null;
  paraCode: string | null;
} {
  let deCode: string | null = null;
  let paraCode: string | null = null;
  const re = new RegExp(MD_DE_PARA_BLOCK.source, "gm");
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const kind = m[1];
    const code = m[2].trim();
    if (kind === "De") deCode = code;
    else if (kind === "Para") paraCode = code;
  }
  return { deCode, paraCode };
}

/**
 * Quebra relatório em blocos `####` e extrai achados com marker ou título.
 */
export function parseFindingsFromReport(
  markdown: string,
  defaultFile?: string | null
): ParsedReportFinding[] {
  const text = String(markdown ?? "");
  if (!text.trim()) return [];

  const chunks = text.split(/(?=^####\s+)/m);
  const out: ParsedReportFinding[] = [];
  const seen = new Set<string>();

  for (const raw of chunks) {
    const block = raw.trim();
    if (!block.startsWith("####")) continue;

    const title = extractBlockTitle(block);
    if (!title) continue;

    const marker = INLINE_MARKER_RE.exec(block);
    let filePath = defaultFile ?? null;
    let lineStart: number | null = null;
    let findingKey = stableFindingId(title);

    if (marker) {
      filePath = marker[1].trim() || filePath;
      lineStart = Number.parseInt(marker[2], 10);
      if (!Number.isFinite(lineStart)) lineStart = null;
      findingKey = marker[3].trim() || findingKey;
    }

    const pt = extractPtSummary(block);
    const summary = pt || extractFindingTheme(title);
    const { deCode, paraCode } = extractDePara(block);
    const hasDePara = block.includes(DE_LABEL) || block.includes(PARA_LABEL);
    const body = hasDePara || pt ? block.slice(0, 4000) : null;

    const dedupe = `${findingKey}|${filePath ?? ""}|${lineStart ?? ""}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    out.push({
      findingKey,
      summary,
      filePath,
      lineStart,
      body,
      deCode,
      paraCode,
    });
  }

  return out;
}

/** Extrai path do header `## \`path\`` se presente. */
export function extractReportFilePath(markdown: string): string | null {
  const m = /^##\s+`([^`]+)`/m.exec(markdown);
  return m ? m[1].trim() : null;
}
