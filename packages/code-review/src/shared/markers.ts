/**
 * Marcadores e labels do formato /avaliar inline (fonte única).
 */

export const INLINE_MARKER_TAG = "avaliar-inline";

/** HTML comment: <!-- avaliar-inline:path:line:fid:id --> */
export const INLINE_MARKER_RE =
  /<!--\s*avaliar-inline:([^:]+):(\d+):fid:([a-z0-9-]+)\s*-->/;

export const DE_LABEL = "**De:**";
export const PARA_LABEL = "**Para:**";

export const PT_SUMMARY_LABEL = "**Em português:**";

export const INLINE_DE_SCORE = 3;
export const INLINE_PARA_SCORE = 2;

/** Regex markdown De/Para code blocks. */
export const MD_DE_PARA_BLOCK =
  /\*\*(De|Para):\*\*\s*\n+```(?:\w+)?\s*\n([\s\S]*?)```/gm;

export function bodyHasInlineMarker(body: string): boolean {
  return body.includes(INLINE_MARKER_TAG);
}

export function buildInlineMarkerHtml(
  filePath: string,
  startLine: number | string,
  findingId: string
): string {
  return `<!-- ${INLINE_MARKER_TAG}:${filePath}:${startLine}:fid:${findingId} -->`;
}
