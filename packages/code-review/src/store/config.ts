/**
 * Config do review store (Supabase / PostgREST).
 */

import { loadDotenvFile as loadDotenvFileFromEnv } from "../dotenv.js";

export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreError";
  }
}

export type StoreConfig = {
  url: string;
  apiKey: string;
  projectSlug: string;
  restBase: string;
};

export type LoadConfigOpts = {
  url?: string;
  apiKey?: string;
  projectSlug?: string;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
};

export function loadConfig(opts: LoadConfigOpts = {}): StoreConfig {
  const e = opts.env ?? process.env;
  const url = String(opts.url ?? e.SUPABASE_URL ?? "").trim();
  const apiKey = String(
    opts.apiKey ??
      e.SUPABASE_SERVICE_ROLE_KEY ??
      e.SUPABASE_KEY ??
      e.SUPABASE_ANON_KEY ??
      ""
  ).trim();
  const projectSlug = String(
    opts.projectSlug ?? e.REVIEW_PROJECT_SLUG ?? "hostdime-ia"
  ).trim();

  if (!url) {
    throw new StoreError(
      "SUPABASE_URL ausente. Local: npm run supabase:start && export SUPABASE_URL=http://127.0.0.1:54321"
    );
  }
  if (!apiKey) {
    throw new StoreError(
      "Chave Supabase ausente (SUPABASE_SERVICE_ROLE_KEY). Local: npm run supabase:status"
    );
  }
  if (!projectSlug) {
    throw new StoreError("REVIEW_PROJECT_SLUG vazio");
  }

  return {
    url,
    apiKey,
    projectSlug,
    restBase: `${url.replace(/\/$/, "")}/rest/v1`,
  };
}

export function buildHeaders(
  apiKey: string,
  { prefer }: { prefer?: string } = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  return headers;
}

export const loadDotenvFile = loadDotenvFileFromEnv;
