---
type: Reference
title: Código do review store
description: Port, CLIs e pontos de integração no pacote code-review.
tags: [store, typescript, cli]
timestamp: 2026-08-10T16:00:00Z
---

## Contexto

Implementação TypeScript em `packages/code-review`. Layout de fatias: [STRUCTURE.md](../../packages/code-review/STRUCTURE.md).

## Superfícies

| Superfície | Onde |
| --- | --- |
| Port + client | `src/store/` |
| Dual-write decisions | `dualWriteDecisions` · `bin/review-dual-write.ts` |
| Publish run/findings | `publishRun` · `bin/review-store-publish.ts` |
| Memory pull/push | `bin/review-memory-pull.ts` · `review-memory-push.ts` |
| LLM merge store | `src/llm/run.ts` ← `storeMemoryForFile` |
| `/finalizar` | `tools/sh/finalizar-review.sh` (dual-write hard) |

## Commands npm

```bash
npm run review:store-smoke
npm run review:dual-write -- [project]
npm run review:store-publish -- --project .
npm run review:memory-pull -- .
npm run review:memory-push -- .
```

Sem store configurado → **exit ≠ 0** (hard).

## Relacionados

- [Review store](review-store.md)
- [Schema do store](review-store-schema.md)
- CI: [ci/README.md](../../packages/code-review/ci/README.md)
