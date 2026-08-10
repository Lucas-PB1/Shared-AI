/**
 * Fatia memory — API pública.
 * init / decisions / compactar / promover / backup / restore
 */

export {
  DECISIONS_INGEST_FILE,
  SCHEMA_VERSION,
  decisionsIngestPath,
  localStamp,
  reviewDir,
  reviewWorkDir,
  utcNowIso,
} from "./paths.js";

export {
  dumpYaml,
  loadContext,
  parseContextYaml,
  writeContext,
} from "./context-yaml.js";

export {
  buildContext,
  ensureV2Scaffold,
  fileStats,
  mode,
  readDecisions,
  readMergedDecisions,
  writeDecisions,
} from "./decisions-io.js";

export {
  cmdBackup,
  cmdCompactar,
  cmdDiff,
  cmdFindingId,
  cmdInit,
  cmdMigrar,
  cmdPromover,
  cmdRestore,
  cmdStatus,
} from "./cmds.js";

export {
  CONVENCOES_SCOPE,
  SCOPE_MAP,
  decisionStoreLabel,
  extractScopeGlob,
  findConvencoesSectionIndex,
  globMatchesFile,
  inferScopeFromFile,
  inferScopeFromSection,
  mergeHistoryIntoContext,
  mergePromotedIntoConvencoes,
  parseConvencoesSections,
  renderConvencoesSections,
  type ConvencoesSection,
  type DecisionLike,
} from "./merge.js";
