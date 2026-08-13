/**
 * Decisions + exclusions/conventions no store (PostgREST).
 */

import { StoreError } from "./config.js";
import type {
  ConventionFields,
  CreateDecisionFields,
  ExclusionFields,
  ListDecisionsOpts,
} from "./port.js";
import type { SupabaseRest } from "./supabase-rest.js";
import { restGetProjectId } from "./supabase-runs.js";

export async function restCreateDecision(
  rest: SupabaseRest,
  projectId: string,
  fields: CreateDecisionFields
): Promise<Record<string, unknown>> {
  const payload = {
    project_id: projectId,
    run_id: fields.runId ?? null,
    finding_id: fields.findingId ?? null,
    finding_key: fields.findingKey,
    verdict: fields.verdict,
    reason: fields.reason ?? null,
    decided_by: fields.decidedBy ?? null,
    source: fields.source ?? null,
    file_path: fields.filePath ?? null,
    summary: fields.summary ?? null,
    schema_version: fields.schemaVersion ?? "1",
    meta: fields.meta ?? {},
  };
  const url = `${rest.config.restBase}/decisions`;
  const rows = (await rest.request(
    "POST",
    url,
    rest.headers({ prefer: "return=representation" }),
    payload
  )) as Array<Record<string, unknown>> | null;
  if (!rows?.length) throw new StoreError("createDecision: resposta vazia");
  return rows[0];
}

export async function restListDecisions(
  rest: SupabaseRest,
  projectId: string,
  opts: ListDecisionsOpts = {}
): Promise<Array<Record<string, unknown>>> {
  const limit = opts.limit ?? 100;
  const q = new URLSearchParams({
    project_id: `eq.${projectId}`,
    select: "*",
    order: "finalized_at.desc",
    limit: String(limit),
  });
  if (opts.findingKey) {
    q.set("finding_key", `eq.${opts.findingKey}`);
  }
  const url = `${rest.config.restBase}/decisions?${q}`;
  const rows = (await rest.request("GET", url, rest.headers())) as
    | Array<Record<string, unknown>>
    | null;
  return rows ?? [];
}

export async function restDeleteDecisionsBySource(
  rest: SupabaseRest,
  projectId: string,
  source: string
): Promise<number> {
  const trimmed = source.trim();
  if (!trimmed) return 0;
  const q = new URLSearchParams({
    project_id: `eq.${projectId}`,
    source: `eq.${trimmed}`,
  });
  const url = `${rest.config.restBase}/decisions?${q}`;
  const rows = (await rest.request(
    "DELETE",
    url,
    rest.headers({ prefer: "return=representation" })
  )) as Array<Record<string, unknown>> | null;
  return rows?.length ?? 0;
}

export async function restListExclusions(
  rest: SupabaseRest,
  projectId: string,
  opts: { activeOnly?: boolean; limit?: number } = {}
): Promise<Array<Record<string, unknown>>> {
  const limit = opts.limit ?? 500;
  const q = new URLSearchParams({
    project_id: `eq.${projectId}`,
    select: "*",
    order: "updated_at.desc",
    limit: String(limit),
  });
  if (opts.activeOnly !== false) {
    q.set("active", "eq.true");
  }
  const url = `${rest.config.restBase}/exclusions?${q}`;
  const rows = (await rest.request("GET", url, rest.headers())) as
    | Array<Record<string, unknown>>
    | null;
  return rows ?? [];
}

export async function restListConventions(
  rest: SupabaseRest,
  projectId: string,
  opts: { limit?: number } = {}
): Promise<Array<Record<string, unknown>>> {
  const limit = opts.limit ?? 500;
  const q = new URLSearchParams({
    project_id: `eq.${projectId}`,
    select: "*",
    order: "updated_at.desc",
    limit: String(limit),
  });
  const url = `${rest.config.restBase}/conventions?${q}`;
  const rows = (await rest.request("GET", url, rest.headers())) as
    | Array<Record<string, unknown>>
    | null;
  return rows ?? [];
}

export async function restUpsertExclusion(
  rest: SupabaseRest,
  projectId: string,
  fields: ExclusionFields
): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {
    project_id: projectId,
    finding_key: fields.findingKey,
    reason: fields.reason ?? "",
    scope_glob: fields.scopeGlob ?? "**/*",
    active: fields.active ?? true,
    updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
  if (fields.occurrences != null) {
    payload.occurrences = fields.occurrences;
  }
  if (fields.source !== undefined) {
    payload.source = fields.source;
  }
  const url = `${rest.config.restBase}/exclusions?on_conflict=project_id,finding_key,scope_glob`;
  const rows = (await rest.request(
    "POST",
    url,
    rest.headers({
      prefer: "resolution=merge-duplicates,return=representation",
    }),
    payload
  )) as Array<Record<string, unknown>> | null;
  if (!rows?.length) throw new StoreError("upsertExclusion: resposta vazia");
  return rows[0];
}

export async function restUpsertConvention(
  rest: SupabaseRest,
  projectId: string,
  fields: ConventionFields
): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {
    project_id: projectId,
    scope_glob: fields.scopeGlob ?? "**/*",
    body: fields.body,
    source: fields.source ?? null,
    updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
  if (fields.findingKey != null && fields.findingKey !== "") {
    payload.finding_key = fields.findingKey;
  }
  if (fields.occurrences != null) {
    payload.occurrences = fields.occurrences;
  }

  // Partial unique index on (project_id, finding_key) is not always
  // addressable via PostgREST on_conflict — select then patch/insert.
  if (fields.findingKey) {
    const q = new URLSearchParams({
      project_id: `eq.${projectId}`,
      finding_key: `eq.${fields.findingKey}`,
      select: "id",
      limit: "1",
    });
    const existing = (await rest.request(
      "GET",
      `${rest.config.restBase}/conventions?${q}`,
      rest.headers()
    )) as Array<{ id: string }> | null;
    if (existing?.length) {
      const id = existing[0].id;
      const patchUrl = `${rest.config.restBase}/conventions?id=eq.${id}`;
      const patched = (await rest.request(
        "PATCH",
        patchUrl,
        rest.headers({ prefer: "return=representation" }),
        {
          body: fields.body,
          scope_glob: fields.scopeGlob ?? "**/*",
          source: fields.source ?? null,
          occurrences: fields.occurrences ?? 1,
          updated_at: payload.updated_at,
        }
      )) as Array<Record<string, unknown>> | null;
      if (!patched?.length) {
        throw new StoreError("upsertConvention: patch vazio");
      }
      return patched[0];
    }
  }

  const rows = (await rest.request(
    "POST",
    `${rest.config.restBase}/conventions`,
    rest.headers({ prefer: "return=representation" }),
    payload
  )) as Array<Record<string, unknown>> | null;
  if (!rows?.length) throw new StoreError("upsertConvention: resposta vazia");
  return rows[0];
}

export async function restListMemory(
  rest: SupabaseRest,
  projectSlug?: string
): Promise<{
  projectId: string;
  decisions: Array<Record<string, unknown>>;
}> {
  const projectId = await restGetProjectId(rest, projectSlug);
  const decisions = await restListDecisions(rest, projectId, { limit: 500 });
  return { projectId, decisions };
}
