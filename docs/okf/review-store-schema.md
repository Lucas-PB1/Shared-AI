---
type: Schema
title: Schema do review store
description: Tabelas, RLS, env e papéis da memória evolutiva.
tags: [store, supabase, schema]
timestamp: 2026-08-10T19:00:00Z
---

## Contexto

DDL e RLS versionados em [`supabase/migrations/`](../../supabase/migrations/). Seed sintético: [`supabase/seed.sql`](../../supabase/seed.sql).

## Modelo mental

```text
projects
  └── review_runs          # uma execução de review
        └── findings       # comentários/achados emitidos
  └── decisions            # ledger aceito|rejeitado|n/a (por finding_key)
        ├── → exclusions   # política negativa (rejeitado / n/a)
        └── → conventions  # política positiva (aceito recorrente, ≥2)
profiles + project_members # ACL cloud (não entram no prompt)
```

## Tabelas

| Tabela | Papel | No prompt `/avaliar`? |
| --- | --- | --- |
| `projects` | Repo/sistema (`slug` = basename) | — |
| `profiles` / `project_members` | Multi-user + roles (JWT/RLS cloud). Local com `service_role` não preenche | Não |
| `review_runs` | Execução (`local` \| `ci` \| `pre_commit` \| `agent`) | Não |
| `findings` | Comentários (summary, file, De/Para/body). Auditoria Studio | Não (por default) |
| `decisions` | Ledger de vereditos humanos; fonte imutável de verdade | Não direto |
| `exclusions` | Política “nunca sugerir”: deriva de `rejeitado` / `nao-aplicavel` | **Sim** |
| `conventions` | Política “aplicar neste projeto”: promove com **2+** `aceito` no mesmo `finding_key` | **Sim** |

### Detalhes

- `finding_key`: estável por **tema** (não `path:linha`).
- `decisions.finding_id`: opcional FK a `findings`.
- `exclusions.occurrences` / `source`: contagem e origem (`finalize`, `memory-push`).
- `conventions.finding_key` + `occurrences`: upsert por projeto+tema.
- RLS: membro só enxerga projetos com membership; `service_role` bypassa (CI/tooling).

### profiles e project_members

Tooling local/CI usa **service_role** e ignora estas tabelas (ficam vazias). Existem para dashboard multi-user no cloud: login JWT → `project_members` decide acesso. **Não** são memória de review.

## Env

| Variável | Uso |
| --- | --- |
| `SUPABASE_URL` | API REST (obrigatória) |
| `SUPABASE_SERVICE_ROLE_KEY` | Tooling/CI (obrigatória) |
| `SUPABASE_KEY` / `SUPABASE_ANON_KEY` | legado/alternativo ao service role |
| `REVIEW_PROJECT_SLUG` | default monorepo; repos ligados usam basename / `--slug` |

## Relacionados

- [Review store](review-store.md)
- [Código do store](review-store-code.md)
- [Supabase local](supabase-local.md)
