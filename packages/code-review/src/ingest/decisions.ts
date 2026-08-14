/**
 * Persistência de decisões de ingest PR (substitui source do PR).
 *
 * Na hora de salvar, cada caso ganha `finding_id` por palavras‑chave
 * (`ingestFindingKey` / `stableFindingId`) — não depende do fid interativo do marker.
 */

import { extractFindingTheme } from "../shared/index.js";
import { readDecisions, writeDecisions } from "../memory/index.js";
import { ingestFindingKey } from "./classify.js";

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
    normalizedNew.push(normalizeIngestDecision(item));
  }
  existing.push(...normalizedNew);
  const normalizedAll = existing.map((item) => normalizeIngestDecision(item));
  writeDecisions(decisionsPath, normalizedAll);
  return normalizedNew;
}

/** Normaliza summary + finding_id (keywords) de um caso de ingest. */
export function normalizeIngestDecision(
  item: Record<string, unknown>
): Record<string, unknown> {
  const row = { ...item };
  const summary = String(row.summary ?? "");
  if (!summary) return row;
  const theme = extractFindingTheme(summary);
  row.summary = theme;
  row.finding_id = ingestFindingKey(theme);
  return row;
}
