/**
 * Fatia skill-routing — skills/rules por path para /avaliar (CI + LLM).
 */

export { matchGlob, scopeMatchesFile } from "./match.js";
export {
  HOSTDIME_SKILL_ROUTES,
  STACK_HINTS,
  STACK_SKILL_ROUTES,
  type SkillRoute,
} from "./routes.js";
export {
  resolveContextForFile,
  resolveMatchingRules,
  resolveSkillIds,
  type FileContext,
  type MatchingRule,
  type ResolveContextOptions,
} from "./resolve.js";
