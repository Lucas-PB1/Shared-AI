/**
 * Dual-write decisões locais → store (sempre hard) + promote memory.
 *
 * - findings: comentário materializado se summary/file e sem finding_id
 * - decisions: ledger
 * - rejeitado | nao-aplicavel → exclusions
 * - aceito ×≥2 no mesmo finding_key → conventions
 */

import { inferScopeFromFile } from "../memory/merge.js";
import { StoreError } from "./config.js";
import type { CreateRunFields, ReviewStorePort } from "./port.js";
import {
  STORE_REQUIRED_MSG,
  STORE_VERDICTS,
  openStore,
} from "./open.js";
import { buildFinalizeCoverageMeta } from "./run-summary.js";

/** Mínimo de `aceito` com o mesmo finding_key para virar convention. */
export const CONVENTION_PROMOTE_THRESHOLD = 2;

const POLICY_SKIP_REASON_PREFIXES = [
  "suggestion / Para",
  "código De removido",
  "indicador `",
  "thread resolvido",
  "merge sem resposta",
  "resposta humana no thread",
];

export type DualWriteResult = {
  attempted: boolean;
  written: number;
  skipped: number;
  exclusions: number;
  conventions: number;
  findings: number;
  runId?: string;
  error?: string;
};

function lineFromDecision(d: Record<string, unknown>): number | null {
  const line = d.line;
  if (typeof line === "number" && Number.isFinite(line)) return line;
  if (typeof line === "string" && /^\d+/.test(line)) {
    return Number.parseInt(line, 10);
  }
  return null;
}

function uuidish(value: unknown): string | null {
  const s = String(value ?? "").trim();
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s
    )
  ) {
    return s;
  }
  return null;
}

/** Texto de convention a partir de summary (+ reason se útil). */
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

export async function dualWriteDecisions(
  decisions: Array<Record<string, unknown>>,
  opts: {
    port?: ReviewStorePort | null;
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    projectSlug?: string;
    createRun?: boolean;
    run?: CreateRunFields;
    decidedBy?: string;
    /** Se setado, apaga decisões desse source antes de gravar (re-ingest idempotente). */
    replaceSource?: string;
  } = {}
): Promise<DualWriteResult> {
  const env = opts.env ?? process.env;
  const port =
    opts.port === undefined
      ? openStore({ env, projectSlug: opts.projectSlug })
      : opts.port;

  if (!port) {
    return {
      attempted: true,
      written: 0,
      skipped: decisions.length,
      exclusions: 0,
      conventions: 0,
      findings: 0,
      error: STORE_REQUIRED_MSG,
    };
  }

  let written = 0;
  let skipped = 0;
  let exclusions = 0;
  let conventions = 0;
  let findings = 0;

  try {
    const projectId = await port.getProjectId(opts.projectSlug);

    if (opts.replaceSource && typeof port.deleteDecisionsBySource === "function") {
      const removed = await port.deleteDecisionsBySource(
        projectId,
        opts.replaceSource
      );
      if (removed > 0) {
        console.log(
          `dual-write: removidas ${removed} decisão(ões) anteriores de source=${opts.replaceSource}`
        );
      }
    }

    let runId: string | undefined;

    if (opts.createRun !== false) {
      const run = await port.createRun(projectId, {
        source: opts.run?.source ?? "local",
        status: "running",
        actorKind: opts.run?.actorKind ?? "tool",
        actorRef: opts.run?.actorRef ?? "dual-write",
        gitSha: opts.run?.gitSha ?? null,
        branch: opts.run?.branch ?? null,
        prNumber: opts.run?.prNumber ?? null,
        reviewSlug: opts.run?.reviewSlug ?? null,
        meta: { ...(opts.run?.meta ?? {}), dual_write: true },
      });
      runId = String(run.id);
    }

    for (const d of decisions) {
      const verdict = String(d.decision ?? "").trim();
      const findingKey = String(d.finding_id ?? "").trim();
      if (!findingKey || !STORE_VERDICTS.has(verdict)) {
        skipped += 1;
        continue;
      }

      const line = lineFromDecision(d);
      const filePath = d.file != null ? String(d.file) : null;
      const summary =
        d.summary != null ? String(d.summary) : null;
      const reason = d.reason != null ? String(d.reason) : null;
      const scopeGlob = inferScopeFromFile(filePath ?? "");

      let findingId =
        uuidish(d.finding_uuid) ?? uuidish(d.store_finding_id);

      const body =
        reason ||
        (d.body != null ? String(d.body) : null) ||
        summary;
      const severity =
        d.severity != null ? String(d.severity) : null;
      const category =
        d.category != null ? String(d.category) : null;
      const deCode =
        d.de_code != null
          ? String(d.de_code)
          : d.deCode != null
            ? String(d.deCode)
            : null;
      const paraCode =
        d.para_code != null
          ? String(d.para_code)
          : d.paraCode != null
            ? String(d.paraCode)
            : null;

      // Materialize finding (comentário) no run se temos conteúdo e ainda sem UUID.
      if (
        !findingId &&
        runId &&
        (summary || filePath || line != null || body || reason)
      ) {
        const created = await port.createFinding(runId, {
          findingKey,
          summary: summary || findingKey,
          filePath,
          lineStart: line,
          lineEnd: line,
          severity,
          category,
          body,
          deCode,
          paraCode,
          meta: {
            review_slug: d.review_slug ?? null,
            source: d.source ?? null,
            from_finalize: true,
            verdict,
            reason,
            root_author: d.root_author ?? null,
            root_is_bot: d.root_is_bot ?? null,
            root_kind: d.root_kind ?? null,
            comments: d.comments ?? null,
            origin: d.origin ?? null,
          },
        });
        findingId = String(created.id ?? "");
        findings += 1;
      }

      const decidedByLogin =
        d.decided_by_login != null && String(d.decided_by_login).trim()
          ? String(d.decided_by_login).trim()
          : null;

      await port.upsertDecision(projectId, {
        findingKey,
        verdict,
        runId: runId ?? null,
        findingId: findingId || null,
        reason,
        decidedBy:
          opts.decidedBy ??
          decidedByLogin ??
          String(d.source ?? "dual-write"),
        source: d.source != null ? String(d.source) : null,
        filePath,
        summary,
        schemaVersion: d.schema != null ? String(d.schema) : "1",
        meta: {
          review_slug: d.review_slug ?? null,
          line,
          category,
          severity,
          source: d.source ?? null,
          body: body ? body.slice(0, 2000) : null,
          root_author: d.root_author ?? null,
          root_is_bot: d.root_is_bot ?? null,
          root_kind: d.root_kind ?? null,
          comments: d.comments ?? null,
          origin: d.origin ?? null,
          decided_by_login: decidedByLogin,
          decided_by_kind: d.decided_by_kind ?? null,
        },
      });
      written += 1;

      if (verdict === "rejeitado" || verdict === "nao-aplicavel") {
        await port.upsertExclusion(projectId, {
          findingKey,
          reason: reason || summary || findingKey,
          scopeGlob,
          active: true,
          source: "finalize",
        });
        exclusions += 1;
      } else if (verdict === "aceito") {
        const prior = await port.listDecisions(projectId, {
          findingKey,
          limit: 200,
        });
        const aceitoCount = countAceitoVerdicts(prior);
        if (aceitoCount >= CONVENTION_PROMOTE_THRESHOLD) {
          const body = conventionBodyFromDecision({
            summary,
            reason,
            findingKey,
          });
          await port.upsertConvention(projectId, {
            scopeGlob,
            body,
            source: "finalize",
            findingKey,
            occurrences: aceitoCount,
          });
          conventions += 1;
        }
      }
    }

    if (runId) {
      await port.completeRun(runId, {
        status: "completed",
        meta: buildFinalizeCoverageMeta(decisions, {
          dual_write: true,
          ...(opts.run?.meta ?? {}),
          written,
          skipped,
          exclusions,
          conventions,
          findings_created: findings,
        }),
      });
    }

    return {
      attempted: true,
      written,
      skipped,
      exclusions,
      conventions,
      findings,
      runId,
    };
  } catch (err) {
    const msg =
      err instanceof StoreError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
    return {
      attempted: true,
      written,
      skipped,
      exclusions,
      conventions,
      findings,
      error: msg,
    };
  }
}

export function logDualWriteResult(
  label: string,
  result: DualWriteResult
): void {
  if (result.error) {
    console.error(`${label}: store dual-write falhou: ${result.error}`);
    return;
  }
  console.error(
    `${label}: store dual-write ok written=${result.written} skipped=${result.skipped}` +
      ` findings=${result.findings ?? 0} exclusions=${result.exclusions ?? 0}` +
      ` conventions=${result.conventions ?? 0}` +
      (result.runId ? ` run=${result.runId}` : "")
  );
}
