/**
 * Persistência de decisões de ingest PR (substitui source do PR).
 */

import {
  extractFindingTheme,
  stableFindingId,
} from "../shared/index.js";
import { readDecisions, writeDecisions } from "../memory/index.js";

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
