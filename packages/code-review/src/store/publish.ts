/**
 * Publica review_run + findings (sempre hard — store obrigatório).
 */

import { StoreError } from "./config.js";
import type {
  CreateFindingFields,
  CreateRunFields,
  ReviewStorePort,
} from "./port.js";
import { STORE_REQUIRED_MSG, openStore } from "./open.js";
import {
  buildRunCoverageMeta,
  type ReportScanEntry,
} from "./run-summary.js";

export type PublishRunResult = {
  attempted: boolean;
  runId?: string;
  findings: number;
  error?: string;
};

export async function publishRun(
  findings: CreateFindingFields[],
  opts: {
    port?: ReviewStorePort | null;
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    projectSlug?: string;
    run?: CreateRunFields;
    status?: "completed" | "failed";
    /** Relatórios escaneados (cobertura mesmo com zero findings). */
    reports?: ReportScanEntry[];
  } = {}
): Promise<PublishRunResult> {
  const env = opts.env ?? process.env;
  const port =
    opts.port === undefined
      ? openStore({ env, projectSlug: opts.projectSlug })
      : opts.port;

  if (!port) {
    return {
      attempted: true,
      findings: 0,
      error: STORE_REQUIRED_MSG,
    };
  }

  try {
    const startMeta = {
      ...(opts.run?.meta ?? {}),
      publish: true,
    };
    const projectId = await port.getProjectId(opts.projectSlug);
    const run = await port.createRun(projectId, {
      source: opts.run?.source ?? "ci",
      status: "running",
      actorKind: opts.run?.actorKind ?? "tool",
      actorRef: opts.run?.actorRef ?? "review-store-publish",
      gitSha: opts.run?.gitSha ?? null,
      branch: opts.run?.branch ?? null,
      prNumber: opts.run?.prNumber ?? null,
      reviewSlug: opts.run?.reviewSlug ?? null,
      meta: startMeta,
    });
    const runId = String(run.id);
    const written: CreateFindingFields[] = [];
    for (const f of findings) {
      if (!f.findingKey || !f.summary) continue;
      await port.createFinding(runId, f);
      written.push(f);
    }
    const finalMeta = buildRunCoverageMeta({
      findings: written,
      reports: opts.reports,
      extra: startMeta,
    });
    await port.completeRun(runId, {
      status: opts.status ?? "completed",
      meta: finalMeta,
    });
    return { attempted: true, runId, findings: written.length };
  } catch (err) {
    const msg =
      err instanceof StoreError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);
    return { attempted: true, findings: 0, error: msg };
  }
}

export function logPublishResult(
  label: string,
  result: PublishRunResult
): void {
  if (result.error) {
    console.error(`${label}: publish falhou: ${result.error}`);
    return;
  }
  console.error(
    `${label}: publish ok findings=${result.findings}` +
      (result.runId ? ` run=${result.runId}` : "")
  );
}
