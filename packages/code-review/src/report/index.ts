/**
 * Fatia report — veredito, resumo de arquivos do PR, markers e snippets helpers.
 */

export {
  VERDICT_NEEDS_CHANGES,
  VERDICT_NOT_RECOMMENDED,
  VERDICT_OK,
  buildInlineCommentBody,
  buildInlineMarker,
  codeSnippetsMatch,
  extractBlockTitle,
  extractPtSummary,
  fileRowPriority,
  formatSummaryTable,
  inlineBlockScore,
  normalizeCodeSnippet,
  parseFilesLogLine,
  parseVerdict,
  reportHasImpeditivo,
  verdictIsFailure,
  type SummaryRow,
} from "./pr-report.js";

export {
  extractReportFilePath,
  parseFindingsFromReport,
  type ParsedReportFinding,
} from "./parse-findings.js";
