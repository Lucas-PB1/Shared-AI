/**
 * Fatia ingest — decisões a partir de threads de PR (regras puras + upsert).
 */

export {
  classifyThread,
  extractCodeIndicators,
  extractDeParaFromBody,
  extractSummary,
  fixAppliedInPr,
  gitLogCommits,
  gitRevParse,
  gitShow,
  parseRepo,
  resolvePrCommitRange,
  resolveProjectPath,
  snippetEverInCommitRange,
  snippetInFile,
  upsertPrDecisions,
  type ListCommitsFn,
  type ShowFileFn,
} from "./from-pr.js";

export { normalizeSnippet } from "../shared/index.js";
