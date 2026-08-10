#!/usr/bin/env node
/**
 * Smoke unitário do ingest (sem gh / rede).
 * Delega ao unit test de finding-ids + ingest.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const unit = path.join(
  root,
  "packages/code-review/tests/ingest/finding-ids-and-ingest.test.ts"
);
const tsx = path.join(root, "node_modules/.bin/tsx");

const proc = spawnSync(tsx, ["--test", unit], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (proc.stdout) process.stdout.write(proc.stdout);
if (proc.stderr) process.stderr.write(proc.stderr);
if (proc.status === 0) {
  console.log("smoke_review_ingest: OK");
}
process.exit(proc.status ?? 1);
