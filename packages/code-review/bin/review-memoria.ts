#!/usr/bin/env node
/**
 * CLI de memória de review v2.
 */
import path from "node:path";
import {
  cmdBackup,
  cmdCompactar,
  cmdDiff,
  cmdFindingId,
  cmdInit,
  cmdMigrar,
  cmdPromover,
  cmdRestore,
  cmdStatus,
} from "../src/memory/index.js";

function parseArgs(argv: string[]): {
  command: string;
  project: string;
  text: string;
  write: boolean;
  all: boolean;
} {
  const positional: string[] = [];
  let write = false;
  let all = false;
  for (const a of argv) {
    if (a === "--write") write = true;
    else if (a === "--all") all = true;
    else positional.push(a);
  }
  return {
    command: positional[0] ?? "",
    project: positional[1] ?? ".",
    text: positional[2] ?? "",
    write,
    all,
  };
}

async function readStdinIfNeeded(need: boolean): Promise<string> {
  if (!need || process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const commands = new Set([
    "status",
    "backup",
    "init",
    "migrar",
    "compactar",
    "promover",
    "restore",
    "diff",
    "finding-id",
  ]);
  if (!args.command || !commands.has(args.command)) {
    console.error(
      "Uso: review-memoria <status|backup|init|migrar|compactar|promover|restore|diff|finding-id> [project] ..."
    );
    return 1;
  }

  if (args.command === "finding-id") {
    // finding-id TEXT | project mis-parse: text may be in project slot
    let text = args.text;
    if (!text && args.project !== ".") {
      // `finding-id TITLE words...` — all after command is text
      text = [args.project, args.text].filter(Boolean).join(" ");
      // actually positional was [command, ...] with project=pos1
      // re-join all positional after command
    }
    const pos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
    text = pos.slice(1).join(" ");
    const stdin = await readStdinIfNeeded(!text.trim());
    return cmdFindingId(text, stdin);
  }

  const project = path.resolve(args.project);
  switch (args.command) {
    case "status":
      return cmdStatus(project);
    case "backup":
      return cmdBackup(project);
    case "init":
      return cmdInit(project, args.write);
    case "migrar":
      return cmdMigrar(project, args.write);
    case "compactar":
      return cmdCompactar(project, args.write);
    case "promover":
      return cmdPromover(project, args.write, args.all);
    case "restore":
      return cmdRestore(project, args.write);
    case "diff":
      return cmdDiff(project);
    default:
      return 1;
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
