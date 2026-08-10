/**
 * Cliente REST thin do review store (Supabase / PostgREST).
 * Native fetch — sem @supabase/supabase-js na v1.
 */

import { StoreError, buildHeaders, type StoreConfig } from "./config.js";

export class ReviewStore {
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
    fields: {
      source?: string;
      status?: string;
      actorKind?: string;
      actorRef?: string | null;
      gitSha?: string | null;
      branch?: string | null;
      prNumber?: number | null;
      reviewSlug?: string | null;
      meta?: Record<string, unknown>;
    } = {}
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
    fields: {
      findingKey: string;
      summary: string;
      filePath?: string | null;
      lineStart?: number | null;
      lineEnd?: number | null;
      severity?: string | null;
      category?: string | null;
      body?: string | null;
      deCode?: string | null;
      paraCode?: string | null;
      meta?: Record<string, unknown>;
    }
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
    fields: {
      findingKey: string;
      verdict: string;
      runId?: string | null;
      reason?: string | null;
      decidedBy?: string | null;
      source?: string | null;
      filePath?: string | null;
      summary?: string | null;
      schemaVersion?: string;
      meta?: Record<string, unknown>;
    }
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
}
