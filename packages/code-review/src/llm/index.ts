/**
 * Fatia llm — /avaliar via Cursor agent ou API OpenAI/Anthropic.
 */

export { inferStack, parseArgs, type LlmCliArgs } from "./args.js";
export {
  buildUserPrompt,
  convencoesForFile,
  exclusionsForFile,
  loadSystemPrompt,
  parseVerdict,
  type UserPromptInput,
} from "./prompt.js";
export {
  callAnthropic,
  callCursor,
  callLLM,
  callOpenAI,
  resolveProvider,
  type LlmProvider,
} from "./providers.js";
export { runLlmFromArgv, runLlmReview } from "./run.js";
