---
type: Reference
title: Código do review store
description: Port, CLIs e pontos de integração no pacote code-review.
tags: [store, typescript, cli]
timestamp: 2026-08-10T19:00:00Z
---

## Contexto

Implementação TypeScript em `packages/code-review`. Layout de fatias: [STRUCTURE.md](../../packages/code-review/STRUCTURE.md).

## Superfícies

| Superfície | Onde |
| --- | --- |
| Port + client | `src/store/` |
| Dual-write + promote | `dualWriteDecisions` · `bin/review-dual-write.ts` |
| Policy no prompt | `storeMemoryForFile` → exclusions + conventions |
| Publish run/findings | `publishRun` · `bin/review-store-publish.ts` |
| Memory pull/push | `bin/review-memory-pull.ts` · `review-memory-push.ts` |
| LLM | `src/llm/run.ts` ← `storeMemoryForFile` |
| `/finalizar` | `tools/sh/finalizar-review.sh` |

### Dual-write promote

1. `createFinding` se há summary/file/line e sem UUID de finding
2. `upsertDecision` (ledger)
3. `rejeitado` | `nao-aplicavel` → `upsertExclusion`
4. `aceito` com `countAceito(finding_key) >= 2` → `upsertConvention`  
   threshold: `CONVENTION_PROMOTE_THRESHOLD` em `dual-write.ts`

## Commands npm

```bash
npm run review:store-smoke
npm run review:dual-write -- --project /path/repo [--slug dna]
npm run review:store-publish -- --project .
npm run review:memory-pull -- .
npm run review:memory-push -- .
```

Sem store configurado → **exit ≠ 0** (hard). Secrets só no monorepo; slug do repo via basename/`--slug`.

## Relacionados

- [Review store](review-store.md)
- [Schema do store](review-store-schema.md)
- CI: [ci/README.md](../../packages/code-review/ci/README.md)
