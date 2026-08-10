/**
 * Abertura da porta store + flags soft/hard (U1/U4).
 */

import { loadConfig, type LoadConfigOpts } from "./config.js";
import type { ReviewStorePort } from "./port.js";
import { ReviewStore } from "./supabase-client.js";

/** Veredictos aceitos pelo enum PostgREST `decision_verdict`. */
export const STORE_VERDICTS = new Set([
  "aceito",
  "rejeitado",
  "nao-aplicavel",
]);

export function isStoreConfigured(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): boolean {
  const url = String(env.SUPABASE_URL ?? "").trim();
  const key = String(
    env.SUPABASE_SERVICE_ROLE_KEY ??
      env.SUPABASE_KEY ??
      env.SUPABASE_ANON_KEY ??
      ""
  ).trim();
  return Boolean(url && key);
}

/** Hard: exige store se REVIEW_STORE_REQUIRED=1. */
export function isStoreRequired(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): boolean {
  const flag = String(env.REVIEW_STORE_REQUIRED ?? "")
    .trim()
    .toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/**
 * Abre porta Supabase ou `null` se offline / não configurado.
 * Nunca lança — loadConfig failures → null.
 */
export function openStore(opts: LoadConfigOpts = {}): ReviewStorePort | null {
  const env = opts.env ?? process.env;
  if (!isStoreConfigured(env)) return null;
  try {
    return new ReviewStore(loadConfig(opts));
  } catch {
    return null;
  }
}
