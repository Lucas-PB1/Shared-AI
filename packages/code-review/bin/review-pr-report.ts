#!/usr/bin/env node
/**
 * CLI de helpers puras do review-github-pr (sem rede).
 */
import { stableFindingId } from "../src/finding-ids.js";
import {
  buildInlineMarker,
  codeSnippetsMatch,
  extractBlockTitle,
  extractPtSummary,
  fileRowPriority,
  formatSummaryTable,
  inlineBlockScore,
  normalizeCodeSnippet,
  parseVerdict,
} from "../src/pr-report.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const args = argv.slice(1);
  const commands = new Set([
    "parse-verdict",
    "finding-id",
    "inline-marker",
    "format-files-table",
    "extract-title",
    "extract-pt",
    "normalize-snippet",
    "snippets-match",
    "block-score",
    "file-priority",
  ]);

  if (!command || !commands.has(command)) {
    console.error(
      "Uso: review-pr-report <command> ...\nComandos: " +
        [...commands].join(", ")
    );
    return 1;
  }

  if (command === "parse-verdict") {
    process.stdout.write(parseVerdict(await readStdin()));
    return 0;
  }

  if (command === "finding-id") {
    const text = args.length
      ? args.join(" ").trim()
      : (await readStdin()).trim();
    if (!text) {
      console.error("Erro: informe título");
      return 1;
    }
    process.stdout.write(stableFindingId(text));
    return 0;
  }

  if (command === "inline-marker") {
    if (args.length < 3) {
      console.error("Uso: inline-marker FILE LINE TITLE");
      return 1;
    }
    process.stdout.write(
      buildInlineMarker(args[0], args[1], args.slice(2).join(" "))
    );
    return 0;
  }

  if (command === "format-files-table") {
    const [table, stats] = formatSummaryTable(await readStdin());
    console.log(JSON.stringify({ table, stats }));
    return 0;
  }

  if (command === "extract-title") {
    process.stdout.write(extractBlockTitle(await readStdin()));
    return 0;
  }

  if (command === "extract-pt") {
    process.stdout.write(extractPtSummary(await readStdin()));
    return 0;
  }

  if (command === "normalize-snippet") {
    process.stdout.write(normalizeCodeSnippet(await readStdin()));
    return 0;
  }

  if (command === "snippets-match") {
    if (args.length < 2) {
      console.error("Uso: snippets-match EXPECTED ACTUAL");
      return 1;
    }
    return codeSnippetsMatch(args[0], args[1]) ? 0 : 1;
  }

  if (command === "block-score") {
    process.stdout.write(String(inlineBlockScore(await readStdin())));
    return 0;
  }

  if (command === "file-priority") {
    if (args.length < 4) {
      console.error("Uso: file-priority ACTION VERDICT INLINE BLOCKING");
      return 1;
    }
    const [prio, icon] = fileRowPriority(
      args[0],
      args[1],
      Number.parseInt(args[2], 10),
      Number.parseInt(args[3], 10)
    );
    process.stdout.write(`${prio}\t${icon}`);
    return 0;
  }

  return 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
