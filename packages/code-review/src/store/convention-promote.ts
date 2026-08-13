/**
 * Promoção de convenção com LLM: reunir fatos, comparar semanticamente
 * com o que já existe, create|merge|skip — sem depender só do slug.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { callLLM } from "../llm/providers.js";
import { conventionBodyFromDecision } from "./dual-write-helpers.js";
import type { ConventionFields, ReviewStorePort } from "./port.js";

export const META_ABSORBED_FINDING_KEYS = "absorbed_finding_keys";
export const META_LLM_PROMOTED = "llm_promoted";
export const META_SUPERSEDED_BY = "superseded_by";

const PACKAGE_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const PROMOTE_ACTIONS = new Set(["create", "merge", "skip"] as const);

export type ConventionPromoteAction = "create" | "merge" | "skip";

export type ConventionFact = {
  findingKey: string;
  summary: string;
  reason?: string | null;
  filePath?: string | null;
  scopeGlob: string;
};

export type ExistingConventionView = {
  id: string;
  findingKey: string | null;
  body: string;
  scopeGlob: string;
  occurrences: number;
  absorbedFindingKeys: string[];
  supersededBy: string | null;
};

export type ConventionPromoteDecision = {
  action: ConventionPromoteAction;
  body: string;
  scopeGlob: string;
  matchId: string | null;
  alsoAbsorbIds: string[];
  rationale: string;
};

export type ConventionPromoteApplyResult = {
  action: ConventionPromoteAction | "bump";
  conventionId?: string;
  body: string;
  skippedLlm: boolean;
};

export function isConventionLlmEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): boolean {
  const flag = String(env.REVIEW_CONVENTION_LLM ?? "")
    .trim()
    .toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  return Boolean(env.CURSOR_API_KEY || env.REVIEW_LLM_API_KEY);
}

export function absorbedFindingKeysFromMeta(
  meta: unknown
): string[] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const raw = (meta as Record<string, unknown>)[META_ABSORBED_FINDING_KEYS];
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw.map((x) => String(x ?? "").trim()).filter(Boolean)
    ),
  ];
}

export function supersededByFromMeta(meta: unknown): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const v = (meta as Record<string, unknown>)[META_SUPERSEDED_BY];
  const s = v != null ? String(v).trim() : "";
  return s || null;
}

export function rowToExistingConvention(
  row: Record<string, unknown>
): ExistingConventionView | null {
  const id = String(row.id ?? "").trim();
  const body = String(row.body ?? "").trim();
  if (!id || !body) return null;
  const findingKeyRaw = String(row.finding_key ?? "").trim();
  return {
    id,
    findingKey: findingKeyRaw || null,
    body,
    scopeGlob: String(row.scope_glob ?? "**/*").trim() || "**/*",
    occurrences: Number(row.occurrences ?? 1) || 1,
    absorbedFindingKeys: absorbedFindingKeysFromMeta(row.meta),
    supersededBy: supersededByFromMeta(row.meta),
  };
}

/** Convenção ativa (não supersedida) já cobre este finding_key. */
export function findCoveringConvention(
  existing: ExistingConventionView[],
  findingKey: string
): ExistingConventionView | null {
  const key = findingKey.trim();
  if (!key) return null;
  for (const c of existing) {
    if (c.supersededBy) continue;
    if (c.findingKey === key) return c;
    if (c.absorbedFindingKeys.includes(key)) return c;
  }
  return null;
}

export function activeConventions(
  existing: ExistingConventionView[]
): ExistingConventionView[] {
  return existing.filter((c) => !c.supersededBy);
}

export function loadConventionPromoteSystemPrompt(
  packageRoot = PACKAGE_ROOT
): string {
  const p = path.join(
    packageRoot,
    "templates/convention-promote-llm-system.md"
  );
  return fs.readFileSync(p, "utf8").trim();
}

export function buildConventionPromoteUserPrompt(
  facts: ConventionFact[],
  existing: ExistingConventionView[]
): string {
  const factsPayload = facts.map((f) => ({
    finding_key: f.findingKey,
    summary: f.summary,
    reason: f.reason ?? null,
    file: f.filePath ?? null,
    scope_glob: f.scopeGlob,
  }));
  const existingPayload = activeConventions(existing).map((c) => ({
    id: c.id,
    finding_key: c.findingKey,
    body: c.body,
    scope_glob: c.scopeGlob,
    occurrences: c.occurrences,
    absorbed_finding_keys: c.absorbedFindingKeys,
  }));
  return [
    "FACTS (accepted findings to promote):",
    JSON.stringify(factsPayload, null, 2),
    "",
    "EXISTING_CONVENTIONS (compare logically; ignore slug equality):",
    JSON.stringify(existingPayload, null, 2),
    "",
    "Decide create, merge, or skip. Return JSON only.",
  ].join("\n");
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("LLM promote: empty response");
  try {
    return JSON.parse(trimmed);
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) return JSON.parse(fence[1].trim());
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("LLM promote: response is not JSON");
  }
}

export function parseConventionPromoteDecision(
  raw: string,
  fallback: { body: string; scopeGlob: string }
): ConventionPromoteDecision {
  const data = extractJsonObject(raw) as Record<string, unknown>;
  const actionRaw = String(data.action ?? "create").trim().toLowerCase();
  const action = (
    PROMOTE_ACTIONS.has(actionRaw as ConventionPromoteAction)
      ? actionRaw
      : "create"
  ) as ConventionPromoteAction;

  const body =
    String(data.body ?? "").trim() ||
    fallback.body;
  const scopeGlob =
    String(data.scope_glob ?? data.scopeGlob ?? "").trim() ||
    fallback.scopeGlob ||
    "**/*";
  const matchIdRaw = data.match_id ?? data.matchId ?? null;
  const matchId =
    matchIdRaw != null && String(matchIdRaw).trim()
      ? String(matchIdRaw).trim()
      : null;
  const alsoRaw = data.also_absorb_ids ?? data.alsoAbsorbIds ?? [];
  const alsoAbsorbIds = Array.isArray(alsoRaw)
    ? [
        ...new Set(
          alsoRaw.map((x) => String(x ?? "").trim()).filter(Boolean)
        ),
      ]
    : [];
  const rationale = String(data.rationale ?? "").trim();

  if ((action === "merge" || action === "skip") && !matchId) {
    return {
      action: "create",
      body,
      scopeGlob,
      matchId: null,
      alsoAbsorbIds: [],
      rationale: rationale || "missing match_id; fell back to create",
    };
  }

  return {
    action,
    body: action === "skip" ? body : body,
    scopeGlob,
    matchId,
    alsoAbsorbIds: alsoAbsorbIds.filter((id) => id !== matchId),
    rationale,
  };
}

export async function decideConventionPromotion(opts: {
  facts: ConventionFact[];
  existing: ExistingConventionView[];
  fallbackBody: string;
  fallbackScopeGlob: string;
  callLlm?: (system: string, user: string) => Promise<string>;
  packageRoot?: string;
}): Promise<ConventionPromoteDecision> {
  const call = opts.callLlm ?? callLLM;
  const system = loadConventionPromoteSystemPrompt(opts.packageRoot);
  const user = buildConventionPromoteUserPrompt(opts.facts, opts.existing);
  const raw = await call(system, user);
  return parseConventionPromoteDecision(raw, {
    body: opts.fallbackBody,
    scopeGlob: opts.fallbackScopeGlob,
  });
}

function mergeAbsorbedKeys(
  current: string[],
  ...extras: Array<string | null | undefined>
): string[] {
  const out = new Set(current);
  for (const k of extras) {
    const s = String(k ?? "").trim();
    if (s) out.add(s);
  }
  return [...out];
}

function metaWithAbsorbed(
  base: Record<string, unknown>,
  absorbed: string[],
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...base,
    [META_ABSORBED_FINDING_KEYS]: absorbed,
    [META_LLM_PROMOTED]: true,
    ...extra,
  };
}

async function supersedeConventions(
  port: ReviewStorePort,
  projectId: string,
  ids: string[],
  primaryId: string,
  existingById: Map<string, ExistingConventionView>
): Promise<string[]> {
  const absorbedFromDupes: string[] = [];
  for (const id of ids) {
    if (!id || id === primaryId) continue;
    const row = existingById.get(id);
    if (row?.findingKey) absorbedFromDupes.push(row.findingKey);
    if (row) absorbedFromDupes.push(...row.absorbedFindingKeys);
    if (typeof port.deleteConvention === "function") {
      await port.deleteConvention(projectId, id);
    } else {
      await port.upsertConvention(projectId, {
        id,
        body: row?.body || "(superseded)",
        scopeGlob: row?.scopeGlob ?? "**/*",
        findingKey: row?.findingKey,
        occurrences: row?.occurrences,
        meta: {
          [META_SUPERSEDED_BY]: primaryId,
          [META_ABSORBED_FINDING_KEYS]: row?.absorbedFindingKeys ?? [],
        },
      });
    }
  }
  return absorbedFromDupes;
}

/**
 * Aplica decisão de promoção no store.
 * Se finding_key já estiver coberto, só bump de occurrences (sem LLM).
 */
export async function applyConventionPromotion(opts: {
  port: ReviewStorePort;
  projectId: string;
  findingKey: string;
  facts: ConventionFact[];
  existingRows: Array<Record<string, unknown>>;
  fallbackBody: string;
  fallbackScopeGlob: string;
  source?: string;
  occurrences: number;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  callLlm?: (system: string, user: string) => Promise<string>;
}): Promise<ConventionPromoteApplyResult> {
  const existing = opts.existingRows
    .map(rowToExistingConvention)
    .filter((c): c is ExistingConventionView => c != null);
  const existingById = new Map(existing.map((c) => [c.id, c]));

  const covered = findCoveringConvention(existing, opts.findingKey);
  if (covered) {
    const meta = metaWithAbsorbed(
      {},
      mergeAbsorbedKeys(covered.absorbedFindingKeys, opts.findingKey),
      covered.supersededBy
        ? { [META_SUPERSEDED_BY]: covered.supersededBy }
        : {}
    );
    await opts.port.upsertConvention(opts.projectId, {
      id: covered.id,
      body: covered.body,
      scopeGlob: covered.scopeGlob,
      findingKey: covered.findingKey,
      occurrences: Math.max(covered.occurrences, opts.occurrences),
      source: opts.source ?? "finalize",
      meta,
    });
    return {
      action: "bump",
      conventionId: covered.id,
      body: covered.body,
      skippedLlm: true,
    };
  }

  const useLlm =
    opts.callLlm != null || isConventionLlmEnabled(opts.env ?? process.env);
  let decision: ConventionPromoteDecision;

  if (useLlm) {
    decision = await decideConventionPromotion({
      facts: opts.facts,
      existing,
      fallbackBody: opts.fallbackBody,
      fallbackScopeGlob: opts.fallbackScopeGlob,
      callLlm: opts.callLlm,
    });
  } else {
    decision = {
      action: "create",
      body: opts.fallbackBody,
      scopeGlob: opts.fallbackScopeGlob,
      matchId: null,
      alsoAbsorbIds: [],
      rationale: "REVIEW_CONVENTION_LLM disabled / no API key",
    };
  }

  if (decision.action === "skip" || decision.action === "merge") {
    const match = decision.matchId
      ? existingById.get(decision.matchId)
      : null;
    if (!match) {
      decision = {
        ...decision,
        action: "create",
        matchId: null,
        alsoAbsorbIds: [],
        rationale: `${decision.rationale}; match missing → create`,
      };
    } else {
      const body =
        decision.action === "skip" ? match.body : decision.body || match.body;
      const fromDupes = await supersedeConventions(
        opts.port,
        opts.projectId,
        decision.alsoAbsorbIds,
        match.id,
        existingById
      );
      const absorbed = mergeAbsorbedKeys(
        match.absorbedFindingKeys,
        opts.findingKey,
        match.findingKey,
        ...fromDupes
      );
      const row = await opts.port.upsertConvention(opts.projectId, {
        id: match.id,
        body,
        scopeGlob: decision.scopeGlob || match.scopeGlob,
        findingKey: match.findingKey,
        occurrences: Math.max(match.occurrences, opts.occurrences),
        source: opts.source ?? "finalize-llm",
        meta: metaWithAbsorbed({}, absorbed),
      });
      return {
        action: decision.action,
        conventionId: String(row.id ?? match.id),
        body,
        skippedLlm: false,
      };
    }
  }

  const absorbed = mergeAbsorbedKeys([], opts.findingKey);
  const row = await opts.port.upsertConvention(opts.projectId, {
    body: decision.body,
    scopeGlob: decision.scopeGlob,
    findingKey: opts.findingKey,
    occurrences: opts.occurrences,
    source: opts.source ?? (useLlm ? "finalize-llm" : "finalize"),
    meta: metaWithAbsorbed({}, absorbed),
  });
  return {
    action: "create",
    conventionId: row.id != null ? String(row.id) : undefined,
    body: decision.body,
    skippedLlm: !useLlm,
  };
}

export function factsFromAceitoDecisions(
  rows: Array<Record<string, unknown>>,
  findingKey: string,
  scopeGlob: string
): ConventionFact[] {
  const facts: ConventionFact[] = [];
  for (const r of rows) {
    if (String(r.verdict ?? "").trim() !== "aceito") continue;
    const summary =
      String(r.summary ?? "").trim() ||
      conventionBodyFromDecision({
        findingKey,
        summary: null,
        reason: null,
      });
    facts.push({
      findingKey,
      summary,
      reason: r.reason != null ? String(r.reason) : null,
      filePath:
        r.file_path != null
          ? String(r.file_path)
          : r.file != null
            ? String(r.file)
            : null,
      scopeGlob,
    });
  }
  if (!facts.length) {
    facts.push({
      findingKey,
      summary: findingKey.replace(/-/g, " "),
      scopeGlob,
    });
  }
  return facts;
}
