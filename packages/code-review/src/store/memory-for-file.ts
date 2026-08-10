/**
 * Camadas de memória do store filtradas por path de arquivo.
 * Store obrigatório — propaga erro se offline ou mal configurado.
 */

import { StoreError } from "./config.js";
import { scopeMatchesFile } from "../skill-routing/index.js";
import type { ReviewStorePort } from "./port.js";
import { fetchStoreMemory } from "./memory-sync.js";

export async function storeMemoryForFile(
  relFile: string,
  opts: {
    port?: ReviewStorePort | null;
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    projectSlug?: string;
  } = {}
): Promise<{ conventions: string; exclusions: string }> {
  const mem = await fetchStoreMemory(opts);
  if (mem.error) {
    throw new StoreError(mem.error);
  }

  const convBullets = mem.conventions
    .filter((c) => scopeMatchesFile(c.scopeGlob, relFile))
    .map((c) => {
      const body = c.body.trim();
      return body.startsWith("- ") ? body : `- ${body}`;
    });

  const exclBullets = mem.exclusions
    .filter((e) => e.active && scopeMatchesFile(e.scopeGlob, relFile))
    .map(
      (e) =>
        `- [rejeitado] ${e.reason || e.findingKey}${
          e.findingKey ? ` (${e.findingKey})` : ""
        }`
    );

  return {
    conventions: convBullets.join("\n"),
    exclusions: exclBullets.join("\n"),
  };
}
