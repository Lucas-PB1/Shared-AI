/**
 * Publica review_run + findings (U2 — driver CI/local).
 */

import { StoreError } from "./config.js";
import type {
  CreateFindingFields,
  CreateRunFields,
  ReviewStorePort,
} from "./port.js";
import { isStoreRequired, openStore } from "./open.js";

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
  } = {}
): Promise<PublishRunResult> {
  const env = opts.env ?? process.env;
  const port =
    opts.port === undefined
      ? openStore({ env, projectSlug: opts.projectSlug })
      : opts.port;

  if (!port) {
    if (isStoreRequired(env)) {
      return {
        attempted: true,
        findings: 0,
        error:
          "REVIEW_STORE_REQUIRED=1 mas store não configurado (SUPABASE_URL/chave)",
      };
    }
    return { attempted: false, findings: 0 };
  }

  try {
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
      meta: { ...(opts.run?.meta ?? {}), publish: true },
    });
    const runId = String(run.id);
    let count = 0;
    for (const f of findings) {
      if (!f.findingKey || !f.summary) continue;
      await port.createFinding(runId, f);
      count += 1;
    }
    await port.completeRun(runId, {
      status: opts.status ?? "completed",
    });
    return { attempted: true, runId, findings: count };
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
  if (!result.attempted && !isStoreRequired()) return;
  if (result.error) {
    console.error(
      `${label}: publish falhou${
        isStoreRequired() ? " (required)" : " (soft)"
      }: ${result.error}`
    );
    return;
  }
  if (!result.attempted) {
    console.error(`${label}: publish skip (store offline)`);
    return;
  }
  console.error(
    `${label}: publish ok findings=${result.findings}` +
      (result.runId ? ` run=${result.runId}` : "")
  );
}
