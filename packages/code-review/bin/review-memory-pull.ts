#!/usr/bin/env tsx
/**
 * Puxa exclusions/conventions do store (fonte de verdade).
 * Por padrão não grava em disco; HOSTDIME_REVIEW_DISK_CACHE=1 → workdir tmp.
 *
 * Uso: review-memory-pull.ts [project] [--slug SLUG]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadDotenvFile,
  pullMemoryToProject,
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

  const result = await pullMemoryToProject(project, {
    projectSlug: args.slug,
  });
  console.log(
    JSON.stringify(
      {
        ok: !result.error,
        attempted: result.attempted,
        exclusions: result.exclusionCount,
        conventions: result.conventionCount,
        cached: result.cached,
        exclusions_path: result.exclusionsPath ?? null,
        conventions_path: result.conventionsPath ?? null,
        error: result.error ?? null,
      },
      null,
      2
    )
  );
  if (result.error) {
    console.error(`review-memory-pull: ${result.error}`);
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
