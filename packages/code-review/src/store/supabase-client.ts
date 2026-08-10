/**
 * Adapter Supabase/PostgREST do ReviewStorePort.
 * Native fetch — sem @supabase/supabase-js.
 */

import { StoreError, buildHeaders, type StoreConfig } from "./config.js";
import type {
  ConventionFields,
  CreateDecisionFields,
  CreateFindingFields,
  CreateRunFields,
  ExclusionFields,
  ListDecisionsOpts,
  ReviewStorePort,
} from "./port.js";

export class ReviewStore implements ReviewStorePort {
  config: StoreConfig;

  constructor(config: StoreConfig) {
    this.config = config;
  }

  headers(opts: { prefer?: string } = {}): Record<string, string> {
    return buildHeaders(this.config.apiKey, opts);
  }

  async request(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: unknown
  ): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new StoreError(`Rede falhou ${method} ${url}: ${msg}`);
    }
    const raw = await res.text();
    if (!res.ok) {
      throw new StoreError(`HTTP ${res.status} ${method} ${url}: ${raw}`);
    }
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  }

  async getProjectId(slug?: string): Promise<string> {
    const s = slug ?? this.config.projectSlug;
    const q = new URLSearchParams({
      slug: `eq.${s}`,
      select: "id",
      limit: "1",
    });
    const url = `${this.config.restBase}/projects?${q}`;
    const rows = (await this.request("GET", url, this.headers())) as
      | Array<{ id: string }>
      | null;
    if (!rows?.length) {
      throw new StoreError(
        `Projeto slug=${JSON.stringify(s)} não encontrado no store`
      );
    }
    return String(rows[0].id);
  }

  async createRun(
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
    const url = `${this.config.restBase}/review_runs`;
    const rows = (await this.request(
      "POST",
      url,
      this.headers({ prefer: "return=representation" }),
      payload
    )) as Array<Record<string, unknown>> | null;
    if (!rows?.length) throw new StoreError("createRun: resposta vazia");
    return rows[0];
  }

  async completeRun(
    runId: string,
    fields: { status?: string; finishedAt?: string } = {}
  ): Promise<Record<string, unknown>> {
    const stamp =
      fields.finishedAt ??
      new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const q = new URLSearchParams({ id: `eq.${runId}` });
    const url = `${this.config.restBase}/review_runs?${q}`;
    const rows = (await this.request(
      "PATCH",
      url,
      this.headers({ prefer: "return=representation" }),
      { status: fields.status ?? "completed", finished_at: stamp }
    )) as Array<Record<string, unknown>> | null;
    if (!rows?.length) throw new StoreError("completeRun: resposta vazia");
    return rows[0];
  }

  async createFinding(
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
    const url = `${this.config.restBase}/findings`;
    const rows = (await this.request(
      "POST",
      url,
      this.headers({ prefer: "return=representation" }),
      payload
    )) as Array<Record<string, unknown>> | null;
    if (!rows?.length) throw new StoreError("createFinding: resposta vazia");
    return rows[0];
  }

  async createDecision(
    projectId: string,
    fields: CreateDecisionFields
  ): Promise<Record<string, unknown>> {
    const payload = {
      project_id: projectId,
      run_id: fields.runId ?? null,
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
    const url = `${this.config.restBase}/decisions`;
    const rows = (await this.request(
      "POST",
      url,
      this.headers({ prefer: "return=representation" }),
      payload
    )) as Array<Record<string, unknown>> | null;
    if (!rows?.length) throw new StoreError("createDecision: resposta vazia");
    return rows[0];
  }

  async upsertDecision(
    projectId: string,
    fields: CreateDecisionFields
  ): Promise<Record<string, unknown>> {
    return this.createDecision(projectId, fields);
  }

  async listDecisions(
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
    const url = `${this.config.restBase}/decisions?${q}`;
    const rows = (await this.request("GET", url, this.headers())) as
      | Array<Record<string, unknown>>
      | null;
    return rows ?? [];
  }

  async listMemory(projectSlug?: string): Promise<{
    projectId: string;
    decisions: Array<Record<string, unknown>>;
  }> {
    const projectId = await this.getProjectId(projectSlug);
    const decisions = await this.listDecisions(projectId, { limit: 500 });
    return { projectId, decisions };
  }

  async listExclusions(
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
    const url = `${this.config.restBase}/exclusions?${q}`;
    const rows = (await this.request("GET", url, this.headers())) as
      | Array<Record<string, unknown>>
      | null;
    return rows ?? [];
  }

  async listConventions(
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
    const url = `${this.config.restBase}/conventions?${q}`;
    const rows = (await this.request("GET", url, this.headers())) as
      | Array<Record<string, unknown>>
      | null;
    return rows ?? [];
  }

  async upsertExclusion(
    projectId: string,
    fields: ExclusionFields
  ): Promise<Record<string, unknown>> {
    const payload = {
      project_id: projectId,
      finding_key: fields.findingKey,
      reason: fields.reason ?? "",
      scope_glob: fields.scopeGlob ?? "**/*",
      active: fields.active ?? true,
      updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    };
    const url = `${this.config.restBase}/exclusions?on_conflict=project_id,finding_key,scope_glob`;
    const rows = (await this.request(
      "POST",
      url,
      this.headers({
        prefer: "resolution=merge-duplicates,return=representation",
      }),
      payload
    )) as Array<Record<string, unknown>> | null;
    if (!rows?.length) throw new StoreError("upsertExclusion: resposta vazia");
    return rows[0];
  }

  async upsertConvention(
    projectId: string,
    fields: ConventionFields
  ): Promise<Record<string, unknown>> {
    const payload = {
      project_id: projectId,
      scope_glob: fields.scopeGlob ?? "**/*",
      body: fields.body,
      source: fields.source ?? null,
      updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    };
    const url = `${this.config.restBase}/conventions`;
    const rows = (await this.request(
      "POST",
      url,
      this.headers({ prefer: "return=representation" }),
      payload
    )) as Array<Record<string, unknown>> | null;
    if (!rows?.length) throw new StoreError("upsertConvention: resposta vazia");
    return rows[0];
  }
}
