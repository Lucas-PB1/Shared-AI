/**
 * Participantes do PR (autor + quem deixou review).
 */

export type PrReviewEntry = {
  login: string;
  state: string;
  is_bot: boolean;
};

export type PrParticipants = {
  pr_author: string | null;
  pr_author_is_bot: boolean;
  reviewers: string[];
  reviews: PrReviewEntry[];
};

export function isBotLogin(login: string | undefined | null): boolean {
  if (!login) return false;
  const normalized = login.trim().toLowerCase();
  if (
    normalized === "github-actions" ||
    normalized === "github-actions[bot]" ||
    normalized === "dependabot[bot]" ||
    normalized === "copilot" ||
    normalized === "copilot[bot]"
  ) {
    return true;
  }
  return normalized.endsWith("[bot]") || normalized.includes("[bot]");
}

/**
 * Extrai autor e reviewers a partir do payload GraphQL do PR.
 */
export function extractPrParticipants(
  pr: Record<string, unknown>
): PrParticipants {
  const authorLogin =
    ((pr.author as { login?: string } | null)?.login ?? null)?.trim() || null;

  const reviewNodes =
    (
      (pr.reviews as { nodes?: Array<Record<string, unknown>> } | null)
        ?.nodes as Array<Record<string, unknown>> | undefined
    ) ?? [];

  const reviews: PrReviewEntry[] = [];
  const reviewerSet = new Set<string>();

  for (const node of reviewNodes) {
    const login =
      ((node.author as { login?: string } | null)?.login ?? "").trim() ||
      "";
    if (!login) continue;
    const state = String(node.state ?? "COMMENTED");
    const bot = isBotLogin(login);
    reviews.push({ login, state, is_bot: bot });
    if (!bot) reviewerSet.add(login);
  }

  return {
    pr_author: authorLogin,
    pr_author_is_bot: isBotLogin(authorLogin),
    reviewers: [...reviewerSet].sort((a, b) => a.localeCompare(b)),
    reviews,
  };
}

/** Une logins humanos que comentaram em threads às listas de reviewers. */
export function mergeThreadReviewers(
  participants: PrParticipants,
  decisions: Array<Record<string, unknown>>
): PrParticipants {
  const set = new Set(participants.reviewers);
  for (const d of decisions) {
    const comments = d.comments;
    if (!Array.isArray(comments)) continue;
    for (const c of comments) {
      if (!c || typeof c !== "object") continue;
      const row = c as Record<string, unknown>;
      const login = String(row.login ?? "").trim();
      if (!login || row.is_bot === true || isBotLogin(login)) continue;
      if (row.role === "reply" || row.role === "root") {
        // raiz humana (review humano) e replies contam como quem avaliou
        if (row.role === "reply" || d.origin === "human-review") {
          set.add(login);
        }
      }
    }
    const decided = String(d.decided_by_login ?? "").trim();
    if (decided && !isBotLogin(decided)) set.add(decided);
  }
  return {
    ...participants,
    reviewers: [...set].sort((a, b) => a.localeCompare(b)),
  };
}
