/**
 * Helpers de dual-write sem dependência de promote/LLM (evita ciclo).
 */

/** Mínimo de `aceito` com o mesmo finding_key para virar convention. */
export const CONVENTION_PROMOTE_THRESHOLD = 2;

export const POLICY_SKIP_REASON_PREFIXES = [
  "suggestion / Para",
  "código De removido",
  "indicador `",
  "thread resolvido",
  "merge sem resposta",
  "resposta humana no thread",
];

/** Texto heurístico de convention a partir de summary (+ reason se útil). */
export function conventionBodyFromDecision(d: {
  summary?: string | null;
  reason?: string | null;
  findingKey: string;
}): string {
  const summary =
    String(d.summary ?? "").trim() ||
    d.findingKey.replace(/-/g, " ").trim() ||
    d.findingKey;
  const reason = String(d.reason ?? "").trim();
  if (
    reason &&
    !POLICY_SKIP_REASON_PREFIXES.some((p) => reason.startsWith(p))
  ) {
    return `${summary} — ${reason.slice(0, 100)}`;
  }
  return summary;
}

export function countAceitoVerdicts(
  rows: Array<Record<string, unknown>>
): number {
  return rows.filter((r) => String(r.verdict ?? "").trim() === "aceito").length;
}
