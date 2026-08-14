/**
 * Fatia ingest — decisões a partir de threads de PR.
 */

export {
  extractCodeIndicators,
  extractDeParaFromBody,
  extractSummary,
  parseRepo,
  snippetInFile,
} from "./extract.js";

export {
  gitLogCommits,
  gitRevParse,
  gitShow,
  resolvePrCommitRange,
  resolveProjectPath,
  snippetEverInCommitRange,
  type ListCommitsFn,
  type ShowFileFn,
} from "./git.js";

export { classifyThread, ingestFindingKey, isBotLogin } from "./classify.js";
export { fixAppliedInPr } from "./fix.js";

export {
  normalizeIngestDecision,
  upsertPrDecisions,
} from "./decisions.js";

export {
  extractPrParticipants,
  mergeThreadReviewers,
  type PrParticipants,
  type PrReviewEntry,
} from "./participants.js";

export { normalizeSnippet } from "../shared/index.js";
