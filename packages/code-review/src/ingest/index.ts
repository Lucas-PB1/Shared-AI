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

export { classifyThread } from "./classify.js";
export { fixAppliedInPr } from "./fix.js";

export { upsertPrDecisions } from "./decisions.js";

export { normalizeSnippet } from "../shared/index.js";
