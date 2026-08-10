/**
 * HTTP base PostgREST (fetch nativo).
 */

import { StoreError, buildHeaders, type StoreConfig } from "./config.js";

export class SupabaseRest {
  config: StoreConfig;

  constructor(config: StoreConfig) {
    this.config = config;
  }

  headers(opts: { prefer?: string } = {}): Record<string, string> {
    return buildHeaders(this.config.apiKey, opts);
  }

  async request(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: unknown
  ): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new StoreError(`Rede falhou ${method} ${url}: ${msg}`);
    }
    const raw = await res.text();
    if (!res.ok) {
      throw new StoreError(`HTTP ${res.status} ${method} ${url}: ${raw}`);
    }
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  }
}
