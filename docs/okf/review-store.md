---
type: Architecture
title: Review store
description: >-
  Fonte de verdade multi-repo de runs, findings e memória de review via Supabase.
  Sem modo offline.
tags: [store, supabase, review]
timestamp: 2026-08-10T16:00:00Z
---

## Contexto

O **review store** unifica code-review no Cursor e no GitHub Actions. Todos os fluxos oficiais exigem `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

## Fluxo

```text
  Cursor /avaliar · /finalizar          GitHub Actions
  review-* tools (bash + tsx)           review-github-pr · ingest · publish
           │                                      │
           └──────── service role / REST ─────────┘
                              │
                              ▼
                    Supabase (projects, review_runs,
                    findings, decisions, exclusions,
                    conventions + RLS)
```

| Ator | Auth | Escreve |
| --- | --- | --- |
| Dev / CLI | service role (local); JWT membro (cloud alvo) | runs local/agent, decisions `/finalizar` |
| CI | `SUPABASE_SERVICE_ROLE_KEY` | runs `ci`, findings, ingest pós-merge |
| Studio | UI | leitura / ops |

Cache efêmero em workdir tmp (`HOSTDIME_REVIEW_WORKDIR` / `$TMPDIR/hostdime-review/…`) — **não** pasta no repo. O banco (Supabase) é a fonte de verdade.

## Status (código)

| Capacidade | Estado |
| --- | --- |
| Store local + smoke | feito |
| Dual-write / publish / memory pull-push | feito (hard) |
| CI template pull → review → publish | feito |
| Schema multi-user + RLS | feito |
| Projeto cloud + secrets operacionais | **ops HostDime** |
| Dashboard multi-repo além do Studio | fora do monorepo |
| Gateway HTTP HostDime na frente do Supabase | opcional / futuro |

## Privacidade

- Snippets de clientes **só no DB** (local ou cloud privado).
- No git do monorepo: migrations, seed sintético, client, `.env.example` — nunca dump de produção ou service keys reais.

## Relacionados

- [Schema do store](review-store-schema.md)
- [Código do store](review-store-code.md)
- [Supabase local](supabase-local.md)
- [Supabase cloud](supabase-cloud.md)
