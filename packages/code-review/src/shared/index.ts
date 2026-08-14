/**
 * Kernel compartilhado do code-review (IDs, markers, snippets, dotenv).
 * Fatias e bins importam daqui — não o inverso.
 */

export {
  FINDING_SLUG_MAX_LEN,
  FINDING_SLUG_MAX_TOKENS,
  FINDING_THEME,
  SLUG_NEAR_MIN_SCORE,
  extractFindingKeywords,
  extractFindingTheme,
  nearSlugPairs,
  slugSimilarity,
  slugTokens,
  slugify,
  stableFindingId,
  type SlugNearPair,
} from "./finding-ids.js";

export {
  DE_LABEL,
  INLINE_DE_SCORE,
  INLINE_MARKER_RE,
  INLINE_MARKER_TAG,
  INLINE_PARA_SCORE,
  MD_DE_PARA_BLOCK,
  PARA_LABEL,
  PT_SUMMARY_LABEL,
  bodyHasInlineMarker,
  buildInlineMarkerHtml,
} from "./markers.js";

export {
  codeSnippetsMatch,
  normalizeCodeSnippet,
  normalizeSnippet,
} from "./snippets.js";

export {
  applyDotenvText,
  loadDotenvFile,
  loadDotenvFileSync,
  parseDotenvText,
} from "./dotenv.js";
