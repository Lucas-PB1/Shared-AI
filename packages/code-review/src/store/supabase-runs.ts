/**
 * Runs + findings no store (PostgREST).
 */

import { StoreError } from "./config.js";
import type { CreateFindingFields, CreateRunFields } from "./port.js";
import type { SupabaseRest } from "./supabase-rest.js";

export async function restGetProjectId(
  rest: SupabaseRest,
  slug?: string
): Promise<string> {
  const s = slug ?? rest.config.projectSlug;
  const q = new URLSearchParams({
    slug: `eq.${s}`,
    select: "id",
    limit: "1",
  });
  const url = `${rest.config.restBase}/projects?${q}`;
  const rows = (await rest.request("GET", url, rest.headers())) as
    | Array<{ id: string }>
    | null;
  if (!rows?.length) {
    throw new StoreError(
      `Projeto slug=${JSON.stringify(s)} não encontrado no store`
    );
  }
  return String(rows[0].id);
}

export async function restCreateRun(
  rest: SupabaseRest,
  projectId: string,
  fields: CreateRunFields = {}
): Promise<Record<string, unknown>> {
  const payload = {
    project_id: projectId,
    source: fields.source ?? "local",
    status: fields.status ?? "running",
    actor_kind: fields.actorKind ?? "human",
    actor_ref: fields.actorRef ?? null,
    git_sha: fields.gitSha ?? null,
    branch: fields.branch ?? null,
    pr_number: fields.prNumber ?? null,
    review_slug: fields.reviewSlug ?? null,
    meta: fields.meta ?? {},
  };
  const url = `${rest.config.restBase}/review_runs`;
  const rows = (await rest.request(
    "POST",
    url,
    rest.headers({ prefer: "return=representation" }),
    payload
  )) as Array<Record<string, unknown>> | null;
  if (!rows?.length) throw new StoreError("createRun: resposta vazia");
  return rows[0];
}

export async function restCompleteRun(
  rest: SupabaseRest,
  runId: string,
  fields: {
    status?: string;
    finishedAt?: string;
    meta?: Record<string, unknown>;
  } = {}
): Promise<Record<string, unknown>> {
  const stamp =
    fields.finishedAt ??
    new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const q = new URLSearchParams({ id: `eq.${runId}` });
  const url = `${rest.config.restBase}/review_runs?${q}`;
  const payload: Record<string, unknown> = {
    status: fields.status ?? "completed",
    finished_at: stamp,
  };
  if (fields.meta && typeof fields.meta === "object") {
    payload.meta = fields.meta;
  }
  const rows = (await rest.request(
    "PATCH",
    url,
    rest.headers({ prefer: "return=representation" }),
    payload
  )) as Array<Record<string, unknown>> | null;
  if (!rows?.length) throw new StoreError("completeRun: resposta vazia");
  return rows[0];
}

export async function restCreateFinding(
  rest: SupabaseRest,
  runId: string,
  fields: CreateFindingFields
): Promise<Record<string, unknown>> {
  const payload = {
    run_id: runId,
    finding_key: fields.findingKey,
    summary: fields.summary,
    file_path: fields.filePath ?? null,
    line_start: fields.lineStart ?? null,
    line_end: fields.lineEnd ?? null,
    severity: fields.severity ?? null,
    category: fields.category ?? null,
    body: fields.body ?? null,
    de_code: fields.deCode ?? null,
    para_code: fields.paraCode ?? null,
    meta: fields.meta ?? {},
  };
  const url = `${rest.config.restBase}/findings`;
  const rows = (await rest.request(
    "POST",
    url,
    rest.headers({ prefer: "return=representation" }),
    payload
  )) as Array<Record<string, unknown>> | null;
  if (!rows?.length) throw new StoreError("createFinding: resposta vazia");
  return rows[0];
}
