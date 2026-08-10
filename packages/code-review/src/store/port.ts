/**
 * Porta do review store — domínio sem PostgREST/fetch.
 * Adaptadores (Supabase) implementam este contrato.
 */

export type CreateRunFields = {
  source?: string;
  status?: string;
  actorKind?: string;
  actorRef?: string | null;
  gitSha?: string | null;
  branch?: string | null;
  prNumber?: number | null;
  reviewSlug?: string | null;
  meta?: Record<string, unknown>;
};

export type CreateFindingFields = {
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
};

export type CreateDecisionFields = {
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
};

export type ListDecisionsOpts = {
  limit?: number;
  findingKey?: string;
};

export type ExclusionFields = {
  findingKey: string;
  reason?: string;
  scopeGlob?: string;
  active?: boolean;
};

export type ConventionFields = {
  scopeGlob?: string;
  body: string;
  source?: string | null;
};

/** Contrato U0–U3. */
export interface ReviewStorePort {
  getProjectId(slug?: string): Promise<string>;
  createRun(
    projectId: string,
    fields?: CreateRunFields
  ): Promise<Record<string, unknown>>;
  completeRun(
    runId: string,
    fields?: { status?: string; finishedAt?: string }
  ): Promise<Record<string, unknown>>;
  createFinding(
    runId: string,
    fields: CreateFindingFields
  ): Promise<Record<string, unknown>>;
  createDecision(
    projectId: string,
    fields: CreateDecisionFields
  ): Promise<Record<string, unknown>>;
  /** Alias semântico U1 — mesmo insert de createDecision. */
  upsertDecision(
    projectId: string,
    fields: CreateDecisionFields
  ): Promise<Record<string, unknown>>;
  listDecisions(
    projectId: string,
    opts?: ListDecisionsOpts
  ): Promise<Array<Record<string, unknown>>>;
  listMemory(projectSlug?: string): Promise<{
    projectId: string;
    decisions: Array<Record<string, unknown>>;
  }>;
  listExclusions(
    projectId: string,
    opts?: { activeOnly?: boolean; limit?: number }
  ): Promise<Array<Record<string, unknown>>>;
  listConventions(
    projectId: string,
    opts?: { limit?: number }
  ): Promise<Array<Record<string, unknown>>>;
  upsertExclusion(
    projectId: string,
    fields: ExclusionFields
  ): Promise<Record<string, unknown>>;
  upsertConvention(
    projectId: string,
    fields: ConventionFields
  ): Promise<Record<string, unknown>>;
}
