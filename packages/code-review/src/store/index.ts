/**
 * Fatia store — API pública (port + adapter Supabase + dual-write U1 + publish U2 + memory U3).
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
  STORE_VERDICTS,
  dualWriteDecisions,
  isStoreConfigured,
  isStoreRequired,
  logDualWriteResult,
  logPublishResult,
  openStore,
  publishRun,
  type DualWriteResult,
  type PublishRunResult,
} from "./dual-write.js";

export {
  fetchStoreMemory,
  formatConventionsMd,
  formatExclusionsYaml,
  mergeTextLayers,
  parseExclusionsYaml,
  pullMemoryToProject,
  pushExclusionsFromProject,
  storeMemoryForFile,
  type ParsedExclusionYaml,
  type StoreConvention,
  type StoreExclusion,
} from "./memory.js";
