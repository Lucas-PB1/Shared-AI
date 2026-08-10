#!/usr/bin/env tsx
/**
 * U3 — envia exclusions.yaml local → store (slim, sem snippets).
 *
 * Uso: review-memory-push.ts [project] [--slug SLUG]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadDotenvFile,
  pushExclusionsFromProject,
} from "../src/store/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");

function parseArgs(argv: string[]): { project: string; slug?: string } {
  let project = ".";
  let slug: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project" && argv[i + 1]) project = argv[++i];
    else if (a === "--slug" && argv[i + 1]) slug = argv[++i];
    else if (!a.startsWith("-")) project = a;
  }
  return { project, slug };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const project = path.resolve(args.project);
  for (const p of [
    path.join(project, ".env"),
    path.join(monorepoRoot, ".env"),
  ]) {
    await loadDotenvFile(p);
  }

  const result = await pushExclusionsFromProject(project, {
    projectSlug: args.slug,
  });
  console.log(
    JSON.stringify(
      {
        ok: !result.error,
        attempted: result.attempted,
        written: result.written,
        error: result.error ?? null,
      },
      null,
      2
    )
  );
  if (!result.attempted) {
    console.error("review-memory-push: store offline — skip");
    return 0;
  }
  if (result.error) {
    console.error(`review-memory-push: ${result.error}`);
    return 1;
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
