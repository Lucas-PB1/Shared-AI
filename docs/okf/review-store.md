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
CI /avaliar (open PR)     →  comentários no GitHub + artifact (tmp)
                             ⛔ sem gravação de resultados no store
merge + ingest            →  review_runs + findings + decisions
                              ├─ rejeitado | n/a  → exclusions
                              └─ aceito (≥2× mesmo finding_key) → conventions
/finalizar (Cursor)         →  dual-write decisions (ledger humano, opcional no dev)
próximo /avaliar            →  prompt ← exclusions + conventions (por path)
```

| Camada | Evolui o quê |
| --- | --- |
| Skills / rules | stack e arquitetura genérica |
| **exclusions** | falsos positivos / o que o time recusou |
| **conventions** | padrões aceitos **recorrentes** neste projeto |
| findings / decisions | auditoria e ledger (**após merge/ingest** ou `/finalizar`), não todo open PR |

## Fluxo

```text
  Cursor /avaliar · /finalizar          GitHub Actions
  review-* tools (bash + tsx)           review-github-pr · ingest pós-merge
           │                                      │
           └──────── service role / REST ─────────┘
                              │
                              ▼
                    Supabase (projects always;
                    runs/findings/decisions/policy
                    só com decisão humana ou merge)
```

| Ator | Auth | Escreve |
| --- | --- | --- |
| Dev / CLI | service role (local); JWT membro (cloud alvo) | dual-write `/finalizar` (decisions + policy) |
| CI open PR | secrets para **pull** de policy | **não** grava runs/findings |
| CI pós-merge | `SUPABASE_SERVICE_ROLE_KEY` | ingest (runs, findings, decisions, policy) |
| Studio | UI | leitura / ops |

Cache efêmero em workdir tmp (`HOSTDIME_REVIEW_WORKDIR` / `$TMPDIR/hostdime-review/…`) — **não** pasta no repo.

Repos em `projects` sem `.env` próprio (ex. DNA): secrets só no monorepo; slug = basename / `--slug`.

## Status (código)

| Capacidade | Estado |
| --- | --- |
| Store local + smoke | feito |
| Dual-write + promote exclusions/conventions | feito (`/finalizar`) |
| Ingest pós-merge (única gravação de resultado no CI) | feito |
| Memory pull no open PR (só lê policy) | feito |
| ~~Publish findings no open PR~~ | **removido** (só artifact/GitHub) |
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
