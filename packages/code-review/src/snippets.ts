/**
 * Normalização de trechos de código (De/Para e matching em git).
 * Fonte única para pr-report e ingest.
 */

/** Remove linhas em branco e indentação; compara conteúdo útil. */
export function normalizeCodeSnippet(code: string): string {
  const lines = code
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((ln) => ln.replace(/\s+$/, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines
    .filter((ln) => ln.trim())
    .map((ln) => ln.trim())
    .join("\n");
}

export function codeSnippetsMatch(expected: string, actual: string): boolean {
  return normalizeCodeSnippet(expected) === normalizeCodeSnippet(actual);
}

/** Alias semântico usado no ingest. */
export const normalizeSnippet = normalizeCodeSnippet;
