/**
 * Camadas de memória do store filtradas por path de arquivo.
 * Injeta só **policy ativa**: exclusions (negativa) + conventions (positiva).
 * Não injeta findings/decisions crus — ledger fica para Studio/auditoria.
 * Store obrigatório — propaga erro se offline ou mal configurado.
 */

import { StoreError } from "./config.js";
import { scopeMatchesFile } from "../skill-routing/index.js";
import type { ReviewStorePort } from "./port.js";
import { fetchStoreMemory } from "./memory-sync.js";
import { supersededByFromMeta } from "./convention-promote.js";

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

  // Dedup bullets por conteúdo (mesma convention promovida N vezes).
  const convSeen = new Set<string>();
  const convBullets: string[] = [];
  for (const c of mem.conventions) {
    if (supersededByFromMeta((c as { meta?: unknown }).meta)) continue;
    if (!scopeMatchesFile(c.scopeGlob, relFile)) continue;
    const body = c.body.trim();
    if (!body) continue;
    const bullet = body.startsWith("- ") ? body : `- ${body}`;
    if (convSeen.has(bullet)) continue;
    convSeen.add(bullet);
    convBullets.push(bullet);
  }

  const exclSeen = new Set<string>();
  const exclBullets: string[] = [];
  for (const e of mem.exclusions) {
    if (!e.active || !scopeMatchesFile(e.scopeGlob, relFile)) continue;
    const text = `- [rejeitado] ${e.reason || e.findingKey}${
      e.findingKey ? ` (${e.findingKey})` : ""
    }`;
    if (exclSeen.has(text)) continue;
    exclSeen.add(text);
    exclBullets.push(text);
  }

  return {
    conventions: convBullets.join("\n"),
    exclusions: exclBullets.join("\n"),
  };
}
