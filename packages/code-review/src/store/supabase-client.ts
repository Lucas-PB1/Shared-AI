/**
 * Adapter ReviewStorePort → Supabase/PostgREST.
 */

import type { StoreConfig } from "./config.js";
import type {
  ConventionFields,
  CreateDecisionFields,
  CreateFindingFields,
  CreateRunFields,
  ExclusionFields,
  ListDecisionsOpts,
  ReviewStorePort,
} from "./port.js";
import {
  restCreateDecision,
  restDeleteDecisionsBySource,
  restListConventions,
  restListDecisions,
  restListExclusions,
  restListMemory,
  restUpsertConvention,
  restUpsertExclusion,
} from "./supabase-decision-memory.js";
import { SupabaseRest } from "./supabase-rest.js";
import {
  restCompleteRun,
  restCreateFinding,
  restCreateRun,
  restGetProjectId,
} from "./supabase-runs.js";

export class ReviewStore extends SupabaseRest implements ReviewStorePort {
  constructor(config: StoreConfig) {
    super(config);
  }

  getProjectId(slug?: string): Promise<string> {
    return restGetProjectId(this, slug);
  }

  createRun(
    projectId: string,
    fields?: CreateRunFields
  ): Promise<Record<string, unknown>> {
    return restCreateRun(this, projectId, fields);
  }

  completeRun(
    runId: string,
    fields?: {
      status?: string;
      finishedAt?: string;
      meta?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    return restCompleteRun(this, runId, fields);
  }

  createFinding(
    runId: string,
    fields: CreateFindingFields
  ): Promise<Record<string, unknown>> {
    return restCreateFinding(this, runId, fields);
  }

  createDecision(
    projectId: string,
    fields: CreateDecisionFields
  ): Promise<Record<string, unknown>> {
    return restCreateDecision(this, projectId, fields);
  }

  upsertDecision(
    projectId: string,
    fields: CreateDecisionFields
  ): Promise<Record<string, unknown>> {
    return this.createDecision(projectId, fields);
  }

  listDecisions(
    projectId: string,
    opts?: ListDecisionsOpts
  ): Promise<Array<Record<string, unknown>>> {
    return restListDecisions(this, projectId, opts);
  }

  deleteDecisionsBySource(
    projectId: string,
    source: string
  ): Promise<number> {
    return restDeleteDecisionsBySource(this, projectId, source);
  }

  listMemory(projectSlug?: string): Promise<{
    projectId: string;
    decisions: Array<Record<string, unknown>>;
  }> {
    return restListMemory(this, projectSlug);
  }

  listExclusions(
    projectId: string,
    opts?: { activeOnly?: boolean; limit?: number }
  ): Promise<Array<Record<string, unknown>>> {
    return restListExclusions(this, projectId, opts);
  }

  listConventions(
    projectId: string,
    opts?: { limit?: number }
  ): Promise<Array<Record<string, unknown>>> {
    return restListConventions(this, projectId, opts);
  }

  upsertExclusion(
    projectId: string,
    fields: ExclusionFields
  ): Promise<Record<string, unknown>> {
    return restUpsertExclusion(this, projectId, fields);
  }

  upsertConvention(
    projectId: string,
    fields: ConventionFields
  ): Promise<Record<string, unknown>> {
    return restUpsertConvention(this, projectId, fields);
  }
}
