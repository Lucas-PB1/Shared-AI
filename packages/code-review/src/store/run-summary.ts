/**
 * Resumo do que foi avaliado em um run (meta de review_runs + painel Studio).
 */

import type { CreateFindingFields } from "./port.js";

export type ReportScanEntry = {
  report: string;
  file: string | null;
  verdict: string | null;
  findings: number;
};

/** Contagem por chave (category, severity, verdict). */
export function countByKey(
  items: Array<string | null | undefined>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const raw of items) {
    const k = String(raw ?? "").trim() || "(none)";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/**
 * Monta meta de cobertura para o review_run (o que o Studio e o CI enxergam).
 */
export function buildRunCoverageMeta(input: {
  reports?: ReportScanEntry[];
  findings: CreateFindingFields[];
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  const findings = input.findings;
  const reports = input.reports ?? [];

  const filesFromFindings = findings
    .map((f) => f.filePath)
    .filter((p): p is string => Boolean(p && String(p).trim()));
  const filesFromReports = reports
    .map((r) => r.file)
    .filter((p): p is string => Boolean(p && String(p).trim()));
  const filesReviewed = [...new Set([...filesFromReports, ...filesFromFindings])].sort();

  const byCategory = countByKey(findings.map((f) => f.category));
  const bySeverity = countByKey(findings.map((f) => f.severity));
  const reportVerdicts = countByKey(reports.map((r) => r.verdict));

  const withDe = findings.filter((f) => Boolean(f.deCode)).length;
  const withPara = findings.filter((f) => Boolean(f.paraCode)).length;
  const withBody = findings.filter((f) => Boolean(f.body)).length;

  return {
    kind: "review_coverage",
    files_reviewed: filesReviewed,
    files_count: filesReviewed.length,
    findings_count: findings.length,
    findings_with_de: withDe,
    findings_with_para: withPara,
    findings_with_body: withBody,
    by_category: byCategory,
    by_severity: bySeverity,
    reports: reports.map((r) => ({
      report: r.report,
      file: r.file,
      verdict: r.verdict,
      findings: r.findings,
    })),
    reports_count: reports.length,
    report_verdicts: reportVerdicts,
    ...(input.extra ?? {}),
  };
}

/**
 * Meta de dual-write / finalizar: quantas decisões por veredito + arquivos.
 */
export function buildFinalizeCoverageMeta(
  decisions: Array<Record<string, unknown>>,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  const files = [
    ...new Set(
      decisions
        .map((d) => (d.file != null ? String(d.file) : null))
        .filter((p): p is string => Boolean(p && p.trim()))
    ),
  ].sort();
  const byVerdict = countByKey(
    decisions.map((d) => String(d.decision ?? d.verdict ?? "").trim() || null)
  );
  return {
    kind: "finalize_coverage",
    files_reviewed: files,
    files_count: files.length,
    decisions_count: decisions.length,
    by_verdict: byVerdict,
    finding_keys: decisions
      .map((d) => String(d.finding_id ?? d.findingKey ?? "").trim())
      .filter(Boolean),
    ...(extra ?? {}),
  };
}
