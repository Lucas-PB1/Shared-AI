/**
 * IDs estáveis de achados de review (tema, não path/linha).
 */

const FINDING_THEME = /^[^:\n]+:\d+(?:-\d+)?\s*[—\-]\s*(.+)$/;

export function slugify(text: string): string {
  const base = String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[-\s]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, 80) || "finding";
}

/** Remove prefixo arquivo:linha — do título do achado. */
export function extractFindingTheme(text: string): string {
  const stripped = String(text).trim();
  if (!stripped) return "finding";
  const match = FINDING_THEME.exec(stripped);
  if (match) return match[1].trim();
  return stripped;
}

/** ID estável entre PRs — só a descrição do achado, não path/linha. */
export function stableFindingId(text: string): string {
  return slugify(extractFindingTheme(text));
}

export { FINDING_THEME };
