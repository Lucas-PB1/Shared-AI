/**
 * Promoção de convenção com LLM: reunir fatos, comparar semanticamente
 * com o que já existe, create|merge|skip — sem depender só do slug.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { callLLM } from "../llm/providers.js";
import { nearSlugPairs, slugSimilarity, SLUG_NEAR_MIN_SCORE } from "../shared/finding-ids.js";
import {
  CONVENTION_PROMOTE_THRESHOLD,
  conventionBodyFromDecision,
} from "./dual-write-helpers.js";
import type { ReviewStorePort } from "./port.js";

export const META_ABSORBED_FINDING_KEYS = "absorbed_finding_keys";
export const META_LLM_PROMOTED = "llm_promoted";
export const META_SUPERSEDED_BY = "superseded_by";
/**
 * Fonte real da convention: aceitos do ledger que justificam a regra.
 * Cada item = uma decisão (finding_key + summary + de qual ingest veio).
 */
export const META_EVIDENCE = "evidence";
export const META_EVIDENCE_COUNT = "evidence_count";
/** PRs só como contexto de navegação — NÃO é a fonte da regra. */
export const META_RELATED_PRS = "related_prs";

const GITHUB_PR_SOURCE_RE = /^github-pr-(\d+)$/i;

export type ConventionEvidenceItem = {
  finding_key: string;
  summary: string;
  decision_source: string | null;
  pr: number | null;
};

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
  evidence: ConventionEvidenceItem[];
  evidenceCount: number;
  /** Contexto de PR apenas — não confundir com evidência. */
  relatedPrs: number[];
  supersededBy: string | null;
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

export function prNumberFromDecisionSource(source: unknown): number | null {
  const s = String(source ?? "").trim();
  const m = GITHUB_PR_SOURCE_RE.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function evidenceFromMeta(meta: unknown): ConventionEvidenceItem[] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const raw = (meta as Record<string, unknown>)[META_EVIDENCE];
  if (!Array.isArray(raw)) return [];
  const out: ConventionEvidenceItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const findingKey = String(row.finding_key ?? "").trim();
    if (!findingKey) continue;
    const prRaw = row.pr;
    const pr =
      prRaw == null || prRaw === ""
        ? null
        : Number.isFinite(Number(prRaw)) && Number(prRaw) > 0
          ? Number(prRaw)
          : null;
    out.push({
      finding_key: findingKey,
      summary: String(row.summary ?? "").trim(),
      decision_source:
        row.decision_source != null && String(row.decision_source).trim()
          ? String(row.decision_source).trim()
          : null,
      pr,
    });
  }
  return out;
}

export function evidenceCountFromMeta(meta: unknown): number {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return 0;
  const n = Number((meta as Record<string, unknown>)[META_EVIDENCE_COUNT]);
  if (Number.isFinite(n) && n > 0) return n;
  return evidenceFromMeta(meta).length;
}

/** related_prs — só contexto; não é a fonte. */
export function relatedPrsFromMeta(meta: unknown): number[] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const raw = (meta as Record<string, unknown>)[META_RELATED_PRS];
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ].sort((a, b) => a - b);
}

/**
 * Fonte real a partir do ledger: cada aceito que justifica as finding_keys.
 * `relatedPrs` é só derivado (navegação), não a evidência.
 */
export function provenanceFromDecisions(
  decisions: Array<Record<string, unknown>>,
  findingKeys: Iterable<string>
): {
  evidence: ConventionEvidenceItem[];
  evidenceCount: number;
  relatedPrs: number[];
} {
  const want = new Set(
    [...findingKeys].map((k) => k.trim()).filter(Boolean)
  );
  const evidence: ConventionEvidenceItem[] = [];
  const seen = new Set<string>();
  for (const r of decisions) {
    if (String(r.verdict ?? "").trim() !== "aceito") continue;
    const key = String(r.finding_key ?? r.finding_id ?? "").trim();
    if (!key || !want.has(key)) continue;
    const src = String(r.source ?? "").trim() || null;
    const id = String(r.id ?? "").trim();
    const dedupe = id || `${key}\0${src ?? ""}\0${String(r.summary ?? "")}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    evidence.push({
      finding_key: key,
      summary: String(r.summary ?? "").trim(),
      decision_source: src,
      pr: prNumberFromDecisionSource(src),
    });
  }
  evidence.sort((a, b) =>
    a.finding_key === b.finding_key
      ? a.summary.localeCompare(b.summary)
      : a.finding_key.localeCompare(b.finding_key)
  );
  const relatedPrs = [
    ...new Set(
      evidence.map((e) => e.pr).filter((n): n is number => n != null)
    ),
  ].sort((a, b) => a - b);
  return {
    evidence,
    evidenceCount: evidence.length,
    relatedPrs,
  };
}

export function mergeRelatedPrs(
  ...lists: Array<Iterable<number> | undefined>
): number[] {
  const out = new Set<number>();
  for (const list of lists) {
    if (!list) continue;
    for (const n of list) {
      if (Number.isFinite(n) && n > 0) out.add(Number(n));
    }
  }
  return [...out].sort((a, b) => a - b);
}

export function mergeEvidence(
  ...lists: Array<Iterable<ConventionEvidenceItem> | undefined>
): ConventionEvidenceItem[] {
  const byDedupe = new Map<string, ConventionEvidenceItem>();
  for (const list of lists) {
    if (!list) continue;
    for (const item of list) {
      const key = item.finding_key.trim();
      if (!key) continue;
      const dedupe = `${key}\0${item.decision_source ?? ""}\0${item.summary}`;
      if (!byDedupe.has(dedupe)) byDedupe.set(dedupe, { ...item, finding_key: key });
    }
  }
  return [...byDedupe.values()].sort((a, b) =>
    a.finding_key === b.finding_key
      ? a.summary.localeCompare(b.summary)
      : a.finding_key.localeCompare(b.finding_key)
  );
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
  const evidence = evidenceFromMeta(row.meta);
  const absorbed = absorbedFindingKeysFromMeta(row.meta);
  return {
    id,
    findingKey: findingKeyRaw || null,
    body,
    scopeGlob: String(row.scope_glob ?? "**/*").trim() || "**/*",
    occurrences: Number(row.occurrences ?? 1) || 1,
    absorbedFindingKeys: absorbed,
    evidence,
    evidenceCount: Math.max(
      evidenceCountFromMeta(row.meta),
      evidence.length,
      absorbed.length
    ),
    relatedPrs: relatedPrsFromMeta(row.meta),
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

/**
 * Se algum finding_key novo é “próximo” (Jaccard) de uma convention existente,
 * devolve a melhor match — para forçar merge em vez de create duplicado.
 */
export function findNearCoveringConvention(
  existing: ExistingConventionView[],
  findingKeys: string[],
  minScore = SLUG_NEAR_MIN_SCORE
): { convention: ExistingConventionView; score: number; viaKey: string } | null {
  const active = activeConventions(existing);
  let best: {
    convention: ExistingConventionView;
    score: number;
    viaKey: string;
  } | null = null;

  for (const raw of findingKeys) {
    const key = raw.trim();
    if (!key) continue;
    // Exact already handled elsewhere; still ok to skip here.
    for (const c of active) {
      const candidates = [
        c.findingKey,
        ...c.absorbedFindingKeys,
      ].filter((k): k is string => Boolean(k && k.trim()));
      for (const cand of candidates) {
        const score = slugSimilarity(key, cand);
        if (score < minScore) continue;
        if (!best || score > best.score) {
          best = { convention: c, score, viaKey: key };
        }
      }
    }
  }
  return best;
}

export function activeConventions(
  existing: ExistingConventionView[]
): ExistingConventionView[] {
  return existing.filter((c) => !c.supersededBy);
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
  const evidence = mergeEvidence(
    evidenceFromMeta(base),
    Array.isArray(extra[META_EVIDENCE])
      ? (extra[META_EVIDENCE] as ConventionEvidenceItem[])
      : undefined
  );
  const relatedPrs = mergeRelatedPrs(
    relatedPrsFromMeta(base),
    Array.isArray(extra[META_RELATED_PRS])
      ? (extra[META_RELATED_PRS] as number[])
      : undefined,
    evidence.map((e) => e.pr).filter((n): n is number => n != null)
  );
  const out: Record<string, unknown> = {
    ...base,
    ...extra,
    [META_ABSORBED_FINDING_KEYS]: absorbed,
    [META_LLM_PROMOTED]: true,
    [META_EVIDENCE]: evidence,
    [META_EVIDENCE_COUNT]: evidence.length,
  };
  if (relatedPrs.length) out[META_RELATED_PRS] = relatedPrs;
  return out;
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

export type AceitoFactAggregate = ConventionFact & {
  occurrences: number;
  relatedPrs: number[];
};

export type ReconcileCluster = {
  action: ConventionPromoteAction;
  findingKeys: string[];
  body: string;
  scopeGlob: string;
  matchId: string | null;
  alsoAbsorbIds: string[];
  rationale: string;
};

export type ReconcileResult = {
  clustersApplied: number;
  conventionsTouched: number;
  deferred: number;
  skippedLlm: boolean;
};

/** Aceitos ainda não cobertos por convention (primary ou absorbed). */
export function aggregateUncoveredAceitos(
  decisions: Array<Record<string, unknown>>,
  existing: ExistingConventionView[],
  inferScope: (filePath: string) => string
): AceitoFactAggregate[] {
  const byKey = new Map<string, AceitoFactAggregate>();
  for (const r of decisions) {
    if (String(r.verdict ?? "").trim() !== "aceito") continue;
    const findingKey = String(r.finding_key ?? r.finding_id ?? "").trim();
    if (!findingKey) continue;
    if (findCoveringConvention(existing, findingKey)) continue;
    const filePath =
      r.file_path != null
        ? String(r.file_path)
        : r.file != null
          ? String(r.file)
          : null;
    const scopeGlob = inferScope(filePath ?? "");
    const summary =
      String(r.summary ?? "").trim() ||
      conventionBodyFromDecision({
        findingKey,
        summary: null,
        reason: null,
      });
    const cur = byKey.get(findingKey);
    const src = String(r.source ?? "").trim();
    const pr = prNumberFromDecisionSource(src);
    if (cur) {
      cur.occurrences += 1;
      if (r.reason && !cur.reason) cur.reason = String(r.reason);
      if (filePath && !cur.filePath) cur.filePath = filePath;
      if (pr != null) {
        cur.relatedPrs = mergeRelatedPrs(cur.relatedPrs, [pr]);
      }
      continue;
    }
    byKey.set(findingKey, {
      findingKey,
      summary,
      reason: r.reason != null ? String(r.reason) : null,
      filePath,
      scopeGlob,
      occurrences: 1,
      relatedPrs: pr != null ? [pr] : [],
    });
  }
  return [...byKey.values()];
}

export function loadConventionReconcileSystemPrompt(
  packageRoot = PACKAGE_ROOT
): string {
  const p = path.join(
    packageRoot,
    "templates/convention-reconcile-llm-system.md"
  );
  return fs.readFileSync(p, "utf8").trim();
}

export function buildConventionReconcileUserPrompt(
  uncovered: AceitoFactAggregate[],
  existing: ExistingConventionView[]
): string {
  const near = nearSlugPairs(uncovered.map((f) => f.findingKey));
  const nearWithConventions = nearSlugPairs([
    ...uncovered.map((f) => f.findingKey),
    ...activeConventions(existing)
      .map((c) => c.findingKey)
      .filter((k): k is string => Boolean(k)),
  ]).filter((p) => {
    const uncoveredSet = new Set(uncovered.map((f) => f.findingKey));
    // pelo menos um lado é uncovered
    return uncoveredSet.has(p.a) || uncoveredSet.has(p.b);
  });

  return [
    "UNCOVERED_ACEITO_FINDINGS (slug = keywords; compare logic after slug prior):",
    JSON.stringify(
      uncovered.map((f) => ({
        finding_key: f.findingKey,
        summary: f.summary,
        reason: f.reason,
        file: f.filePath,
        scope_glob: f.scopeGlob,
        occurrences: f.occurrences,
        related_prs: f.relatedPrs,
      })),
      null,
      2
    ),
    "",
    "SLUG_NEAR_PAIRS (Jaccard on keyword tokens; higher ⇒ more likely same rule — still verify logically):",
    JSON.stringify(
      nearWithConventions.slice(0, 40).map((p) => ({
        a: p.a,
        b: p.b,
        score: Number(p.score.toFixed(3)),
      })),
      null,
      2
    ),
    "",
    "EXISTING_CONVENTIONS (already promoted — do not recreate; merge/skip only when absorbing new keys). evidence[] is the real source (aceitos), related_prs is only navigation context:",
    JSON.stringify(
      activeConventions(existing).map((c) => ({
        id: c.id,
        finding_key: c.findingKey,
        body: c.body,
        scope_glob: c.scopeGlob,
        occurrences: c.occurrences,
        absorbed_finding_keys: c.absorbedFindingKeys,
        evidence_count: c.evidenceCount,
        evidence: c.evidence.map((e) => ({
          finding_key: e.finding_key,
          summary: e.summary.slice(0, 80),
        })),
        related_prs: c.relatedPrs,
      })),
      null,
      2
    ),
    "",
    near.length
      ? `Hint: ${near.length} near-slug pair(s) among uncovered — prefer those for clustering.`
      : "Hint: no near-slug pairs among uncovered; rely on logic only.",
    "Return JSON only.",
  ].join("\n");
}

export function parseReconcileLlmResponse(raw: string): {
  clusters: ReconcileCluster[];
  deferredFindingKeys: string[];
} {
  const data = extractJsonObject(raw) as Record<string, unknown>;
  const clustersRaw = Array.isArray(data.clusters) ? data.clusters : [];
  const clusters: ReconcileCluster[] = [];
  for (const item of clustersRaw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const actionRaw = String(row.action ?? "create").trim().toLowerCase();
    const action = (
      PROMOTE_ACTIONS.has(actionRaw as ConventionPromoteAction)
        ? actionRaw
        : "create"
    ) as ConventionPromoteAction;
    const keysRaw = row.finding_keys ?? row.findingKeys ?? [];
    const findingKeys = Array.isArray(keysRaw)
      ? [
          ...new Set(
            keysRaw.map((k) => String(k ?? "").trim()).filter(Boolean)
          ),
        ]
      : [];
    if (!findingKeys.length) continue;
    const matchIdRaw = row.match_id ?? row.matchId ?? null;
    const matchId =
      matchIdRaw != null && String(matchIdRaw).trim()
        ? String(matchIdRaw).trim()
        : null;
    const alsoRaw = row.also_absorb_ids ?? row.alsoAbsorbIds ?? [];
    const alsoAbsorbIds = Array.isArray(alsoRaw)
      ? [
          ...new Set(
            alsoRaw.map((x) => String(x ?? "").trim()).filter(Boolean)
          ),
        ]
      : [];
    let actionFinal = action;
    if ((action === "merge" || action === "skip") && !matchId) {
      actionFinal = "create";
    }
    clusters.push({
      action: actionFinal,
      findingKeys,
      body: String(row.body ?? "").trim(),
      scopeGlob:
        String(row.scope_glob ?? row.scopeGlob ?? "").trim() || "**/*",
      matchId: actionFinal === "create" ? null : matchId,
      alsoAbsorbIds,
      rationale: String(row.rationale ?? "").trim(),
    });
  }
  const deferredRaw =
    data.deferred_finding_keys ?? data.deferredFindingKeys ?? [];
  const deferredFindingKeys = Array.isArray(deferredRaw)
    ? [
        ...new Set(
          deferredRaw.map((k) => String(k ?? "").trim()).filter(Boolean)
        ),
      ]
    : [];
  return { clusters, deferredFindingKeys };
}

/** Fallback sem LLM: só keys com occurrences ≥ limiar (slug). */
export function heuristicReconcileClusters(
  uncovered: AceitoFactAggregate[],
  threshold = CONVENTION_PROMOTE_THRESHOLD
): { clusters: ReconcileCluster[]; deferredFindingKeys: string[] } {
  const clusters: ReconcileCluster[] = [];
  const deferredFindingKeys: string[] = [];
  for (const f of uncovered) {
    if (f.occurrences < threshold) {
      deferredFindingKeys.push(f.findingKey);
      continue;
    }
    clusters.push({
      action: "create",
      findingKeys: [f.findingKey],
      body: conventionBodyFromDecision({
        findingKey: f.findingKey,
        summary: f.summary,
        reason: f.reason,
      }),
      scopeGlob: f.scopeGlob,
      matchId: null,
      alsoAbsorbIds: [],
      rationale: "heuristic same-key threshold",
    });
  }
  return { clusters, deferredFindingKeys };
}

async function applyReconcileCluster(opts: {
  port: ReviewStorePort;
  projectId: string;
  cluster: ReconcileCluster;
  uncoveredByKey: Map<string, AceitoFactAggregate>;
  existingById: Map<string, ExistingConventionView>;
  source: string;
  allDecisions: Array<Record<string, unknown>>;
}): Promise<boolean> {
  const {
    cluster,
    uncoveredByKey,
    existingById,
    port,
    projectId,
    source,
    allDecisions,
  } = opts;
  const keys = cluster.findingKeys;
  const primaryKey = keys[0];
  const occ = keys.reduce(
    (n, k) => n + (uncoveredByKey.get(k)?.occurrences ?? 1),
    0
  );
  const fallbackBody =
    cluster.body ||
    uncoveredByKey.get(primaryKey)?.summary ||
    primaryKey.replace(/-/g, " ");
  const scopeGlob =
    cluster.scopeGlob ||
    uncoveredByKey.get(primaryKey)?.scopeGlob ||
    "**/*";

  // Fonte real = aceitos do ledger; related_prs só contexto.
  const fromLedger = provenanceFromDecisions(allDecisions, [
    ...keys,
  ]);
  const provenanceExtra = {
    [META_EVIDENCE]: fromLedger.evidence,
    [META_EVIDENCE_COUNT]: fromLedger.evidenceCount,
    [META_RELATED_PRS]: fromLedger.relatedPrs,
  };

  if (cluster.action === "create") {
    // Evidência: várias keys (lógica) OU mesmo key com ≥N aceitos (occurrences).
    const evidence = Math.max(keys.length, occ);
    if (evidence < CONVENTION_PROMOTE_THRESHOLD) {
      return false;
    }
    // Terceiro parecido com convention existente → merge, nunca outra row.
    const near = findNearCoveringConvention(
      [...existingById.values()],
      keys
    );
    if (near) {
      const absorbed = mergeAbsorbedKeys(
        near.convention.absorbedFindingKeys,
        near.convention.findingKey,
        ...keys
      );
      const mergedEvidence = mergeEvidence(
        near.convention.evidence,
        fromLedger.evidence
      );
      await port.upsertConvention(projectId, {
        id: near.convention.id,
        body: near.convention.body,
        scopeGlob: near.convention.scopeGlob,
        findingKey: near.convention.findingKey,
        occurrences: Math.max(near.convention.occurrences, occ, keys.length),
        source,
        meta: metaWithAbsorbed({}, absorbed, {
          [META_EVIDENCE]: mergedEvidence,
          [META_EVIDENCE_COUNT]: mergedEvidence.length,
          [META_RELATED_PRS]: mergeRelatedPrs(
            near.convention.relatedPrs,
            fromLedger.relatedPrs
          ),
        }),
      });
      return true;
    }
    await port.upsertConvention(projectId, {
      body: fallbackBody,
      scopeGlob,
      findingKey: primaryKey,
      occurrences: Math.max(occ, keys.length),
      source,
      meta: metaWithAbsorbed(
        {},
        mergeAbsorbedKeys([], ...keys),
        provenanceExtra
      ),
    });
    return true;
  }

  const match = cluster.matchId
    ? existingById.get(cluster.matchId)
    : findNearCoveringConvention([...existingById.values()], keys)
        ?.convention ?? null;
  if (!match) {
    const evidence = Math.max(keys.length, occ);
    if (evidence < CONVENTION_PROMOTE_THRESHOLD) return false;
    await port.upsertConvention(projectId, {
      body: fallbackBody,
      scopeGlob,
      findingKey: primaryKey,
      occurrences: Math.max(occ, keys.length),
      source,
      meta: metaWithAbsorbed(
        {},
        mergeAbsorbedKeys([], ...keys),
        provenanceExtra
      ),
    });
    return true;
  }

  const body =
    cluster.action === "skip" ? match.body : cluster.body || match.body;
  const fromDupes = await supersedeConventions(
    port,
    projectId,
    cluster.alsoAbsorbIds,
    match.id,
    existingById
  );
  const absorbed = mergeAbsorbedKeys(
    match.absorbedFindingKeys,
    match.findingKey,
    ...keys,
    ...fromDupes
  );
  const mergedLedger = provenanceFromDecisions(allDecisions, absorbed);
  const mergedEvidence = mergeEvidence(
    match.evidence,
    mergedLedger.evidence,
    fromLedger.evidence
  );
  await port.upsertConvention(projectId, {
    id: match.id,
    body,
    scopeGlob: cluster.scopeGlob || match.scopeGlob,
    findingKey: match.findingKey,
    occurrences: Math.max(match.occurrences, occ),
    source,
    meta: metaWithAbsorbed({}, absorbed, {
      [META_EVIDENCE]: mergedEvidence,
      [META_EVIDENCE_COUNT]: mergedEvidence.length,
      [META_RELATED_PRS]: mergeRelatedPrs(
        match.relatedPrs,
        mergedLedger.relatedPrs,
        fromLedger.relatedPrs
      ),
    }),
  });
  return true;
}

/**
 * Reconcilia conventions por **lógica** (LLM), não por igualdade de slug.
 * Singles sem peer e sem match → deferred; clusters ≥2 ou merge/skip → store.
 */
export async function reconcileConventionsWithLlm(opts: {
  port: ReviewStorePort;
  projectId: string;
  decisions?: Array<Record<string, unknown>>;
  existingRows?: Array<Record<string, unknown>>;
  inferScope: (filePath: string) => string;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  callLlm?: (system: string, user: string) => Promise<string>;
  source?: string;
  packageRoot?: string;
}): Promise<ReconcileResult> {
  const decisions =
    opts.decisions ??
    (await opts.port.listDecisions(opts.projectId, { limit: 500 }));
  const existingRows =
    opts.existingRows ??
    (await opts.port.listConventions(opts.projectId, { limit: 500 }));
  let existing = existingRows
    .map(rowToExistingConvention)
    .filter((c): c is ExistingConventionView => c != null);
  const uncovered = aggregateUncoveredAceitos(
    decisions,
    existing,
    opts.inferScope
  );
  if (!uncovered.length) {
    return {
      clustersApplied: 0,
      conventionsTouched: 0,
      deferred: 0,
      skippedLlm: true,
    };
  }

  const useLlm =
    opts.callLlm != null || isConventionLlmEnabled(opts.env ?? process.env);
  let clusters: ReconcileCluster[];
  let deferredFindingKeys: string[];
  let skippedLlm = !useLlm;

  if (useLlm) {
    const call = opts.callLlm ?? callLLM;
    const system = loadConventionReconcileSystemPrompt(opts.packageRoot);
    const user = buildConventionReconcileUserPrompt(uncovered, existing);
    const raw = await call(system, user);
    ({ clusters, deferredFindingKeys } = parseReconcileLlmResponse(raw));
  } else {
    ({ clusters, deferredFindingKeys } = heuristicReconcileClusters(uncovered));
  }

  const uncoveredByKey = new Map(uncovered.map((f) => [f.findingKey, f]));
  const source = opts.source ?? (useLlm ? "reconcile-llm" : "reconcile");
  let clustersApplied = 0;
  let conventionsTouched = 0;

  for (const cluster of clusters) {
    // Refresh map after each write so merge targets stay current.
    existing = (
      await opts.port.listConventions(opts.projectId, { limit: 500 })
    )
      .map(rowToExistingConvention)
      .filter((c): c is ExistingConventionView => c != null);
    const existingById = new Map(existing.map((c) => [c.id, c]));
    const touched = await applyReconcileCluster({
      port: opts.port,
      projectId: opts.projectId,
      cluster,
      uncoveredByKey,
      existingById,
      source,
      allDecisions: decisions,
    });
    if (touched) {
      clustersApplied += 1;
      conventionsTouched += 1;
    } else {
      deferredFindingKeys.push(...cluster.findingKeys);
    }
  }

  return {
    clustersApplied,
    conventionsTouched,
    deferred: [...new Set(deferredFindingKeys)].length,
    skippedLlm,
  };
}
