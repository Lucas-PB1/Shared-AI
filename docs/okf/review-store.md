---
type: Architecture
title: Review store
description: >-
  Fonte de verdade multi-repo: runs, findings, decisions e policy
  (exclusions/conventions) via Supabase. Memória evolutiva no /finalizar.
tags: [store, supabase, review]
timestamp: 2026-08-10T19:00:00Z
---

## Contexto

O **review store** unifica code-review no Cursor e no GitHub Actions. Todos os fluxos oficiais exigem `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

## Memória evolutiva

```text
/avaliar ou CI publish  →  review_runs + findings (comentários)
/finalizar              →  decisions
                            ├─ rejeitado | n/a  → exclusions (sempre)
                            └─ aceito (≥2× mesmo finding_key) → conventions
próximo /avaliar        →  prompt ← exclusions + conventions (por path)
```

| Camada | Evolui o quê |
| --- | --- |
| Skills / rules | stack e arquitetura genérica |
| **exclusions** | falsos positivos / o que o time recusou |
| **conventions** | padrões aceitos **recorrentes** neste projeto |
| findings / decisions | auditoria e ledger (Studio), não fine-tune de pesos |

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
| Dev / CLI | service role (local); JWT membro (cloud alvo) | runs, findings no finalize, decisions, policy |
| CI | `SUPABASE_SERVICE_ROLE_KEY` | runs `ci`, findings publish, ingest pós-merge |
| Studio | UI | leitura / ops |

Cache efêmero em workdir tmp (`HOSTDIME_REVIEW_WORKDIR` / `$TMPDIR/hostdime-review/…`) — **não** pasta no repo.

Repos em `projects` sem `.env` próprio (ex. DNA): secrets só no monorepo; slug = basename / `--slug`.

## Status (código)

| Capacidade | Estado |
| --- | --- |
| Store local + smoke | feito |
| Dual-write + promote exclusions/conventions | feito |
| Publish / memory pull-push | feito (hard) |
| CI template pull → review → publish | feito |
| Schema multi-user + RLS | feito (ACL; não é fine-tuning) |
| Projeto cloud + secrets | **ops HostDime** |
| Dashboard multi-repo | fora do monorepo |

## Privacidade

- Snippets de clientes **só no DB** (local ou cloud privado).
- No git do monorepo: migrations, seed sintético, client, `.env.example` — nunca dump de produção ou service keys reais.

## Relacionados

- [Schema do store](review-store-schema.md)
- [Código do store](review-store-code.md)
- [Supabase local](supabase-local.md)
- [Supabase cloud](supabase-cloud.md)
