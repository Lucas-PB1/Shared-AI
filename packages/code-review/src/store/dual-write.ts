/**
 * Dual-write decisões locais → store (sempre hard).
 */

import { StoreError } from "./config.js";
import type { CreateRunFields, ReviewStorePort } from "./port.js";
import {
  STORE_REQUIRED_MSG,
  STORE_VERDICTS,
  openStore,
} from "./open.js";

export type DualWriteResult = {
  attempted: boolean;
  written: number;
  skipped: number;
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

export async function dualWriteDecisions(
  decisions: Array<Record<string, unknown>>,
  opts: {
    port?: ReviewStorePort | null;
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    projectSlug?: string;
    createRun?: boolean;
    run?: CreateRunFields;
    decidedBy?: string;
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
      error: STORE_REQUIRED_MSG,
    };
  }

  let written = 0;
  let skipped = 0;

  try {
    const projectId = await port.getProjectId(opts.projectSlug);
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
      await port.upsertDecision(projectId, {
        findingKey,
        verdict,
        runId: runId ?? null,
        reason: d.reason != null ? String(d.reason) : null,
        decidedBy: opts.decidedBy ?? String(d.source ?? "dual-write"),
        source: d.source != null ? String(d.source) : null,
        filePath: d.file != null ? String(d.file) : null,
        summary: d.summary != null ? String(d.summary) : null,
        schemaVersion: d.schema != null ? String(d.schema) : "1",
        meta: {
          review_slug: d.review_slug ?? null,
          line,
          category: d.category ?? null,
        },
      });
      written += 1;
    }

    if (runId) {
      await port.completeRun(runId, { status: "completed" });
    }

    return { attempted: true, written, skipped, runId };
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
      (result.runId ? ` run=${result.runId}` : "")
  );
}
