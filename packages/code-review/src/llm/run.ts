import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveContextForFile } from "../skill-routing/index.js";
import { inferStack, parseArgs, type LlmCliArgs } from "./args.js";
import {
  buildUserPrompt,
  convencoesForFile,
  exclusionsForFile,
  loadSystemPrompt,
} from "./prompt.js";
import { callLLM, resolveProvider } from "./providers.js";
import {
  mergeTextLayers,
  storeMemoryForFile,
} from "../store/index.js";

const PACKAGE_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function readOptional(filePath: string): string {
  if (!filePath || !fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

export async function runLlmReview(args: LlmCliArgs): Promise<string> {
  if (!args.project || !args.file) {
    throw new Error(
      "Uso: review-llm --project PATH --file REL_PATH [--static-file FILE] [--diff-file FILE] [--output FILE]",
    );
  }

  const provider = resolveProvider();
  const hasKey =
    provider === "cursor"
      ? Boolean(process.env.CURSOR_API_KEY || process.env.REVIEW_LLM_API_KEY)
      : Boolean(process.env.REVIEW_LLM_API_KEY);

  if (!hasKey) {
    const keyName =
      provider === "cursor" ? "CURSOR_API_KEY" : "REVIEW_LLM_API_KEY";
    throw new Error(`${keyName} não definido.`);
  }

  const absFile = path.join(args.project, args.file);
  if (!fs.existsSync(absFile)) {
    throw new Error(`arquivo não encontrado: ${absFile}`);
  }

  const source = fs.readFileSync(absFile, "utf8");
  const stack = inferStack(args.file);
  const staticOut = readOptional(args.staticFile);
  const diff = readOptional(args.diffFile);
  // Cache local (se houver) + store obrigatório
  let convencoes = convencoesForFile(args.project, args.file);
  let exclusions = exclusionsForFile(args.project, args.file);
  const storeLayer = await storeMemoryForFile(args.file);
  convencoes = mergeTextLayers(convencoes, storeLayer.conventions);
  exclusions = mergeTextLayers(exclusions, storeLayer.exclusions);
  const codeReviewRoot = process.env.HOSTDIME_IA_ROOT
    ? path.join(process.env.HOSTDIME_IA_ROOT, "packages/code-review")
    : PACKAGE_ROOT;
  const skillContext = resolveContextForFile(args.project, args.file, {
    codeReviewRoot,
  });
  const system = loadSystemPrompt(PACKAGE_ROOT);
  const user = buildUserPrompt({
    relFile: args.file,
    stack,
    source,
    diff,
    staticOut,
    convencoes,
    exclusions,
    skillsContext: skillContext.contextText,
    skillIds: skillContext.skillIds,
    ruleIds: skillContext.ruleIds,
  });

  const report = await callLLM(system, user);
  if (!report) {
    throw new Error("LLM retornou resposta vazia.");
  }

  if (args.output) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, report);
  }

  return report;
}

export async function runLlmFromArgv(argv: string[] = process.argv): Promise<number> {
  try {
    const args = parseArgs(argv);
    const report = await runLlmReview(args);
    if (!args.output) {
      process.stdout.write(report);
    }
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message.startsWith("Uso:") ? message : `Erro: ${message}`);
    return 1;
  }
}
