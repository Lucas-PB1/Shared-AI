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
  dualWriteDecisions,
  logDualWriteResult,
  type DualWriteResult,
} from "./dual-write.js";

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
