/**
 * IDs estáveis de achados: slug por **palavras‑chave**, não pelo título inteiro.
 * Proximidade de slug → prior para equality lógica (LLM).
 */

const FINDING_THEME = /^[^:\n]+:\d+(?:-\d+)?\s*[—\-]\s*(.+)$/;

/** Máximo de tokens no slug (específico, estável). */
export const FINDING_SLUG_MAX_TOKENS = 6;
/** Comprimento máximo do slug. */
export const FINDING_SLUG_MAX_LEN = 64;
/** Jaccard mínimo para considerar slugs “próximos”. */
export const SLUG_NEAR_MIN_SCORE = 0.34;

const STOPWORDS = new Set([
  // PT
  "a",
  "as",
  "o",
  "os",
  "um",
  "uma",
  "uns",
  "umas",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "por",
  "para",
  "pra",
  "com",
  "sem",
  "sob",
  "sobre",
  "entre",
  "ate",
  "até",
  "que",
  "se",
  "ao",
  "aos",
  "à",
  "às",
  "ou",
  "mas",
  "nao",
  "não",
  "ja",
  "já",
  "so",
  "só",
  "mais",
  "menos",
  "muito",
  "pouco",
  "quando",
  "onde",
  "como",
  "isso",
  "isto",
  "esse",
  "essa",
  "este",
  "esta",
  "aquilo",
  "ser",
  "sendo",
  "foi",
  "era",
  "ter",
  "tem",
  "há",
  "ha",
  "deve",
  "deveria",
  "ideal",
  "legal",
  "acho",
  "imagino",
  "alguma",
  "algum",
  "forma",
  "coisa",
  "mesma",
  "mesmo",
  // EN
  "the",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "from",
  "with",
  "without",
  "by",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "as",
  "if",
  "when",
  "where",
  "how",
  "not",
  "no",
  "yes",
  "should",
  "would",
  "could",
  "must",
  "may",
  "might",
  "will",
  "can",
  "we",
  "you",
  "they",
  "i",
  "our",
  "your",
]);

export function slugify(text: string): string {
  const base = String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[-\s]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, FINDING_SLUG_MAX_LEN) || "finding";
}

/** Remove prefixo arquivo:linha — do título do achado. */
export function extractFindingTheme(text: string): string {
  const stripped = String(text).trim();
  if (!stripped) return "finding";
  const match = FINDING_THEME.exec(stripped);
  if (match) return match[1].trim();
  return stripped;
}

/**
 * Tokeniza tema em palavras‑chave (técnicas / substantivas).
 * Remove stopwords; preserva tokens com dígitos ou camelCase quebrado.
 */
export function extractFindingKeywords(theme: string): string[] {
  const normalized = String(theme)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[`'"“”]/g, " ")
    .toLowerCase();

  const raw = normalized
    .split(/[^a-z0-9_]+/g)
    .map((t) => t.trim())
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of raw) {
    if (token.length < 2 && !/\d/.test(token)) continue;
    if (STOPWORDS.has(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
    if (out.length >= FINDING_SLUG_MAX_TOKENS) break;
  }
  return out;
}

/**
 * ID estável entre PRs: slug de palavras‑chave (não o título completo).
 * Ex.: "title.trim() sem guarda" → `title-trim-guarda`
 */
export function stableFindingId(text: string): string {
  const theme = extractFindingTheme(text);
  const keywords = extractFindingKeywords(theme);
  if (!keywords.length) return slugify(theme).slice(0, FINDING_SLUG_MAX_LEN);
  return slugify(keywords.join("-")).slice(0, FINDING_SLUG_MAX_LEN);
}

export function slugTokens(slug: string): string[] {
  return String(slug)
    .toLowerCase()
    .split(/-+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Similaridade Jaccard 0..1 entre tokens de dois slugs. */
export function slugSimilarity(a: string, b: string): number {
  const ta = new Set(slugTokens(a));
  const tb = new Set(slugTokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export type SlugNearPair = {
  a: string;
  b: string;
  score: number;
};

/** Pares de slugs próximos (score ≥ min), ordenados do mais próximo ao menos. */
export function nearSlugPairs(
  slugs: string[],
  minScore = SLUG_NEAR_MIN_SCORE
): SlugNearPair[] {
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  const pairs: SlugNearPair[] = [];
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const score = slugSimilarity(unique[i], unique[j]);
      if (score >= minScore) {
        pairs.push({ a: unique[i], b: unique[j], score });
      }
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
}

export { FINDING_THEME };
