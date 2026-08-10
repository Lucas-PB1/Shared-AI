#!/usr/bin/env tsx
/**
 * /avaliar LLM — gera relatório no formato do command /avaliar.
 * Uso: tsx review-llm.ts --project PATH --file REL_PATH [...]
 * Ou:  bash packages/code-review/tools/sh/review-llm.sh ...
 */
import { runLlmFromArgv } from "../src/llm/index.js";

const code = await runLlmFromArgv(process.argv);
process.exit(code);
