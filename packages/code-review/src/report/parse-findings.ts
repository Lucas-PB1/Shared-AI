/**
 * Parse findings de relatórios /avaliar (markdown) para publish no store.
 */

import {
  INLINE_MARKER_RE,
  MD_DE_PARA_BLOCK,
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
  severity: string | null;
  category: string | null;
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
    // Bloco completo no body — Studio/auditoria precisam do contexto.
    const body = block.slice(0, 8000);
    const severity = extractLabeledField(block, "Severidade|Severity");
    const category = extractLabeledField(block, "Categoria|Category");

    const dedupe = `${findingKey}|${filePath ?? ""}|${lineStart ?? ""}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    out.push({
      findingKey,
      summary,
      filePath,
      lineStart,
      body: body || null,
      deCode,
      paraCode,
      severity,
      category,
    });
  }

  return out;
}

/** Extrai path do header `## \`path\`` se presente. */
export function extractReportFilePath(markdown: string): string | null {
  const m = /^##\s+`([^`]+)`/m.exec(markdown);
  return m ? m[1].trim() : null;
}

/** `**Veredito:** OK` (CI) / line no topo do relatório. */
export function extractReportVerdict(markdown: string): string | null {
  const m =
    /\*\*Veredito:\*\*\s*(.+)$/im.exec(markdown) ||
    /^Veredito:\s*(.+)$/im.exec(markdown);
  return m ? m[1].trim() : null;
}

function extractLabeledField(
  block: string,
  labelAlt: string
): string | null {
  const re = new RegExp(
    `\\*\\*(?:${labelAlt}):\\*\\*\\s*(.+)`,
    "i"
  );
  const m = re.exec(block);
  return m ? m[1].trim() : null;
}
