---
type: Schema
title: Schema do review store
description: Tabelas, RLS, env e artefatos versionados do Supabase.
tags: [store, supabase, schema]
timestamp: 2026-08-10T16:00:00Z
---

## Contexto

DDL e RLS versionados em [`supabase/migrations/`](../../supabase/migrations/). Seed sintético: [`supabase/seed.sql`](../../supabase/seed.sql).

## Tabelas

| Tabela | Papel |
| --- | --- |
| `projects` | Repo/sistema (`slug`, GitHub opcional) |
| `profiles` / `project_members` | Multi-user + roles |
| `review_runs` | Execução (`local` \| `ci` \| `pre_commit` \| `agent`) |
| `findings` | Achados (podem ter body sensível) |
| `decisions` | `aceito` \| `rejeitado` \| `nao-aplicavel` |
| `exclusions` / `conventions` | Memória slim / bullets por scope |

- `finding_key`: estável por **tema** (não `path:linha`).
- RLS: membro só enxerga projetos com membership; `service_role` bypassa (CI/tooling).

## Env

| Variável | Uso |
| --- | --- |
| `SUPABASE_URL` | API REST (obrigatória) |
| `SUPABASE_SERVICE_ROLE_KEY` | Tooling/CI (obrigatória) |
| `SUPABASE_KEY` / `SUPABASE_ANON_KEY` | legado/alternativo ao service role |
| `REVIEW_PROJECT_SLUG` | slug em `projects` (ex. `hostdime-hub`) |

## Relacionados

- [Review store](review-store.md)
- [Código do store](review-store-code.md)
- [Supabase local](supabase-local.md)
