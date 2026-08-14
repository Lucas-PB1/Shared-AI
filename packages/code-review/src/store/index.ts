/**
 * Fatia store — API pública.
 */

export type {
  ConventionFields,
  CreateDecisionFields,
  CreateFindingFields,
  CreateRunFields,
  ExclusionFields,
  ListDecisionsOpts,
  ReviewStorePort,
} from "./port.js";

export { ReviewStore } from "./supabase-client.js";
export {
  StoreError,
  loadConfig,
  buildHeaders,
  loadDotenvFile,
  type LoadConfigOpts,
  type StoreConfig,
} from "./config.js";

export {
  STORE_REQUIRED_MSG,
  STORE_VERDICTS,
  isStoreConfigured,
  isStoreRequired,
  openStore,
  requireStore,
} from "./open.js";

export {
  CONVENTION_PROMOTE_THRESHOLD,
  conventionBodyFromDecision,
  countAceitoVerdicts,
  dualWriteDecisions,
  logDualWriteResult,
  type DualWriteResult,
} from "./dual-write.js";

export {
  META_ABSORBED_FINDING_KEYS,
  META_EVIDENCE,
  META_EVIDENCE_COUNT,
  META_LLM_PROMOTED,
  META_RELATED_PRS,
  META_SUPERSEDED_BY,
  absorbedFindingKeysFromMeta,
  aggregateUncoveredAceitos,
  findCoveringConvention,
  findNearCoveringConvention,
  activeConventions,
  evidenceCountFromMeta,
  evidenceFromMeta,
  heuristicReconcileClusters,
  isConventionLlmEnabled,
  parseReconcileLlmResponse,
  prNumberFromDecisionSource,
  provenanceFromDecisions,
  reconcileConventionsWithLlm,
  relatedPrsFromMeta,
  rowToExistingConvention,
  type ConventionEvidenceItem,
  type ReconcileCluster,
} from "./convention-promote.js";

export {
  logPublishResult,
  publishRun,
  type PublishRunResult,
} from "./publish.js";

export {
  formatConventionsMd,
  formatExclusionsYaml,
  mergeTextLayers,
  parseExclusionsYaml,
  type ParsedExclusionYaml,
  type StoreConvention,
  type StoreExclusion,
} from "./memory-format.js";

export {
  fetchStoreMemory,
  pullMemoryToProject,
  pushExclusionsFromProject,
} from "./memory-sync.js";

export { storeMemoryForFile } from "./memory-for-file.js";

export {
  preserveProcessReviewSlugAfter,
  resolveProjectSlug,
  slugFromGitRemote,
} from "./project-slug.js";

export {
  buildFinalizeCoverageMeta,
  buildRunCoverageMeta,
  countByKey,
  type ReportScanEntry,
} from "./run-summary.js";
