/**
 * Download client-side de memória do projeto (md / csv Excel).
 */

export function downloadBlob(
  filename: string,
  mime: string,
  text: string,
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSV UTF-8 com BOM — abre limpo no Excel. */
export function toCsv(
  headers: string[],
  rows: Array<Record<string, unknown>>,
): string {
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => csvEscape(row[h])).join(','),
    ),
  ];
  return `\uFEFF${lines.join('\n')}\n`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Record<string, unknown>>,
): void {
  downloadBlob(filename, 'text/csv;charset=utf-8', toCsv(headers, rows));
}

export function downloadMarkdown(filename: string, markdown: string): void {
  downloadBlob(filename, 'text/markdown;charset=utf-8', markdown);
}

type ConventionExportRow = {
  finding_key: string | null;
  scope_glob: string;
  body: string;
  evidence_count: number;
  related_prs: number[];
  absorbed_finding_keys: string[];
};

export function formatConventionsMarkdown(
  projectSlug: string,
  items: ConventionExportRow[],
): string {
  const byScope = new Map<string, ConventionExportRow[]>();
  for (const c of items) {
    const scope = c.scope_glob || '**/*';
    const list = byScope.get(scope) ?? [];
    list.push(c);
    byScope.set(scope, list);
  }
  const lines = [
    `# Convenções — ${projectSlug}`,
    '',
    `_Exportado da Memória do projeto. Fonte = decisions aceitas (≥2)._`,
    '',
  ];
  for (const scope of [...byScope.keys()].sort()) {
    lines.push(`## Escopo: \`${scope}\``);
    lines.push('');
    for (const c of byScope.get(scope) ?? []) {
      const body = c.body.trim();
      const bullet = body.startsWith('- ') ? body : `- ${body}`;
      lines.push(bullet);
      const metaBits: string[] = [];
      if (c.finding_key) metaBits.push(`key: \`${c.finding_key}\``);
      if (c.evidence_count > 0) {
        metaBits.push(`${c.evidence_count} evidência(s)`);
      }
      if (c.related_prs.length) {
        metaBits.push(`PRs: ${c.related_prs.join(', ')}`);
      }
      if (c.absorbed_finding_keys.length) {
        metaBits.push(
          `absorbed: ${c.absorbed_finding_keys.map((k) => `\`${k}\``).join(', ')}`,
        );
      }
      if (metaBits.length) {
        lines.push(`  - _${metaBits.join(' · ')}_`);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}
