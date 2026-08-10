/**
 * Abertura da porta store — sempre obrigatório (sem modo offline).
 */

import { StoreError, loadConfig, type LoadConfigOpts } from "./config.js";
import type { ReviewStorePort } from "./port.js";
import { ReviewStore } from "./supabase-client.js";

/** Veredictos aceitos pelo enum PostgREST `decision_verdict`. */
export const STORE_VERDICTS = new Set([
  "aceito",
  "rejeitado",
  "nao-aplicavel",
]);

export const STORE_REQUIRED_MSG =
  "Store obrigatório: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_KEY)";

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

/**
 * Store sempre exigido. Flag REVIEW_STORE_REQUIRED mantida só por compat
 * (qualquer valor desabilitador é ignorado).
 */
export function isStoreRequired(
  _env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): boolean {
  return true;
}

/**
 * Abre porta Supabase ou `null` se env ausente (testes / probes).
 * Fluxos oficiais usam `requireStore`.
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

/** Abre o store ou lança `StoreError`. */
export function requireStore(opts: LoadConfigOpts = {}): ReviewStorePort {
  const env = opts.env ?? process.env;
  if (!isStoreConfigured(env)) {
    throw new StoreError(STORE_REQUIRED_MSG);
  }
  try {
    return new ReviewStore(loadConfig(opts));
  } catch (err) {
    if (err instanceof StoreError) throw err;
    throw new StoreError(
      err instanceof Error ? err.message : String(err)
    );
  }
}
