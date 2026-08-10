/**
 * Paths e constantes da memória de review no projeto.
 */
import path from "node:path";
import { DECISIONS_INGEST_FILE } from "./merge.js";

export const SCHEMA_VERSION = 1;

export { DECISIONS_INGEST_FILE };

export function utcNowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function localStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function reviewDir(project: string): string {
  return path.join(project, ".cursor", "review");
}

export function decisionsIngestPath(project: string): string {
  return path.join(reviewDir(project), DECISIONS_INGEST_FILE);
}
