/**
 * Workdir de review — **fora do projeto**.
 * Fonte de verdade de memória/decisões: store Supabase.
 * Disco local só cache/rascunho de tooling (CI reports, dual-write input).
 */
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
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

/**
 * Diretório de trabalho do review para um projeto.
 * - `HOSTDIME_REVIEW_WORKDIR` se definido (ex. CI: `${{ runner.temp }}/hostdime-review`)
 * - senão: `$TMPDIR/hostdime-review/<hash do path absoluto>`
 *
 * **Só** workdir em tmp — memória oficial no store Supabase.
 */
export function reviewWorkDir(project: string): string {
  const override = String(process.env.HOSTDIME_REVIEW_WORKDIR ?? "").trim();
  if (override) return path.resolve(override);
  const abs = path.resolve(project);
  const hash = createHash("sha256").update(abs).digest("hex").slice(0, 16);
  return path.join(tmpdir(), "hostdime-review", hash);
}

export function decisionsIngestPath(project: string): string {
  return path.join(reviewWorkDir(project), DECISIONS_INGEST_FILE);
}
