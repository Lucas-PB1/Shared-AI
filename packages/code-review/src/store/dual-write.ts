/**
 * Dual-write (U1 soft) + publish run (U2) + flags hard (U4 opcional).
 * Arquivo local = offline; store se configurado.
 * Soft: falha de rede/store não aborta (retorna error string) a menos que
 * REVIEW_STORE_REQUIRED=1 (unificação hard).
 */

import {
  StoreError,
  loadConfig,
  type LoadConfigOpts,
} from "./config.js";
import type {
  CreateFindingFields,
  CreateRunFields,
  ReviewStorePort,
} from "./port.js";
import { ReviewStore } from "./supabase-client.js";

/** Veredictos aceitos pelo enum PostgREST `decision_verdict`. */
export const STORE_VERDICTS = new Set([
  "aceito",
  "rejeitado",
  "nao-aplicavel",
]);

export type DualWriteResult = {
  /** Store tentado (config presente). */
  attempted: boolean;
  written: number;
  skipped: number;
  runId?: string;
  error?: string;
};

export type PublishRunResult = {
  attempted: boolean;
  runId?: string;
  findings: number;
  error?: string;
};

export function isStoreConfigured(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): boolean {
  const url = String(env.SUPABASE_URL ?? "").trim();
  const key = String(
    env.SUPABASE_SERVICE_ROLE_KEY ??
      env.SUPABASE_KEY ??
      env.SUPABASE_ANON_KEY ??
      ""
  ).trim();
  return Boolean(url && key);
}

/** Hard: exige store se configurado (ou se REVIEW_STORE_REQUIRED=1). */
export function isStoreRequired(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): boolean {
  const flag = String(env.REVIEW_STORE_REQUIRED ?? "")
    .trim()
    .toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/**
 * Abre porta Supabase ou `null` se offline / não configurado.
 * Nunca lança — loadConfig failures → null.
 */
export function openStore(
  opts: LoadConfigOpts = {}
): ReviewStorePort | null {
  const env = opts.env ?? process.env;
  if (!isStoreConfigured(env)) return null;
  try {
    return new ReviewStore(loadConfig(opts));
  } catch {
    return null;
  }
}

function lineFromDecision(d: Record<string, unknown>): number | null {
  const line = d.line;
  if (typeof line === "number" && Number.isFinite(line)) return line;
  if (typeof line === "string" && /^\d+/.test(line)) {
    return Number.parseInt(line, 10);
  }
  return null;
}

/**
 * Envia decisões locais (jsonl shape) ao store.
 * Cria um `review_runs` se `createRun` (default true) e associa às decisions.
 */
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
    if (isStoreRequired(env)) {
      return {
        attempted: true,
        written: 0,
        skipped: decisions.length,
        error:
          "REVIEW_STORE_REQUIRED=1 mas store não configurado (SUPABASE_URL/chave)",
      };
    }
    return {
      attempted: false,
      written: 0,
      skipped: decisions.length,
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

/**
 * Publica um review_run + findings (U2 — driver CI/local).
 * Offline se store não configurado (soft, salvo REVIEW_STORE_REQUIRED).
 */
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

/** Log de dual-write suave (stderr). */
export function logDualWriteResult(
  label: string,
  result: DualWriteResult
): void {
  if (!result.attempted && !isStoreRequired()) return;
  if (result.error) {
    console.error(
      `${label}: store dual-write falhou${
        isStoreRequired() ? " (required)" : " (arquivo local OK)"
      }: ${result.error}`
    );
    return;
  }
  if (!result.attempted) return;
  console.error(
    `${label}: store dual-write ok written=${result.written} skipped=${result.skipped}` +
      (result.runId ? ` run=${result.runId}` : "")
  );
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
