/**
 * Parser de dotenv KEY=VAL (sem deps).
 */
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

export function parseDotenvText(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith("#") || !stripped.includes("=")) {
      continue;
    }
    const eq = stripped.indexOf("=");
    const key = stripped.slice(0, eq).trim();
    let val = stripped.slice(eq + 1).trim();
    if (
      (val.startsWith("'") && val.endsWith("'")) ||
      (val.startsWith('"') && val.endsWith('"'))
    ) {
      val = val.slice(1, -1);
    }
    if (key) out[key] = val;
  }
  return out;
}

/** Aplica .env no process.env (ou objeto) sem sobrescrever chaves já definidas. */
export function applyDotenvText(
  raw: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): void {
  for (const [key, val] of Object.entries(parseDotenvText(raw))) {
    if (env[key] === undefined) env[key] = val;
  }
}

export async function loadDotenvFile(
  filePath: string | URL,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return;
  }
  applyDotenvText(raw, env);
}

export function loadDotenvFileSync(
  filePath: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): void {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return;
  }
  applyDotenvText(raw, env);
}
