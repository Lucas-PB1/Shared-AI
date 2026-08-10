/**
 * Parse e extração de body de comentário PR (sem git).
 */

import {
  MD_DE_PARA_BLOCK,
  normalizeSnippet,
} from "../shared/index.js";

const SUGGESTION_BLOCK = /```suggestion\s*\n([\s\S]*?)```/m;
const BACKTICK_CODE = /`([^`]+)`/g;

export function parseRepo(repository: string): [string, string] {
  const slash = repository.indexOf("/");
  const owner = slash >= 0 ? repository.slice(0, slash) : "";
  const name = slash >= 0 ? repository.slice(slash + 1) : "";
  if (!owner || !name) {
    throw new Error(`Repositório inválido: ${repository}`);
  }
  return [owner, name];
}

export function extractSummary(body: string): string {
  for (const line of body.split(/\r?\n/)) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith("<!--")) continue;
    return stripped.slice(0, 240);
  }
  return "achado /avaliar";
}

export function extractDeParaFromBody(body: string): [string, string] {
  let de = "";
  let para = "";
  MD_DE_PARA_BLOCK.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MD_DE_PARA_BLOCK.exec(body)) !== null) {
    const label = match[1];
    const code = match[2];
    if (label === "De") de = code;
    else para = code;
  }
  const suggestion = SUGGESTION_BLOCK.exec(body);
  if (suggestion) para = para || suggestion[1];
  return [de, para];
}

export function extractCodeIndicators(body: string): string[] {
  const indicators: string[] = [];
  BACKTICK_CODE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BACKTICK_CODE.exec(body)) !== null) {
    const token = match[1].trim();
    if (token.length < 3) continue;
    if (!indicators.includes(token)) indicators.push(token);
  }
  return indicators;
}

export function snippetInFile(
  fileContent: string,
  snippet: string,
  _hintLine = 1
): boolean {
  void _hintLine;
  const norm = normalizeSnippet(snippet);
  if (!norm) return false;
  const lines = fileContent.split(/\r?\n/);
  const parts = norm.split("\n");
  const n = parts.length;
  if (n === 0 || !lines.length) return false;
  for (let i = 0; i <= lines.length - n; i++) {
    const window = lines.slice(i, i + n).join("\n").trim();
    if (
      window === norm ||
      parts.every((p, j) => lines[i + j].includes(p))
    ) {
      return true;
    }
  }
  return fileContent.includes(norm);
}
