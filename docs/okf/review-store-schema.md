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
| `review_runs` | Execução (`local` \| `ci` \| `pre_commit` \| `agent`). `meta` guarda cobertura | Não |
| `findings` | Comentários (summary, file, De/Para/body, severity). Auditoria Studio | Não (por default) |
| `decisions` | Ledger de vereditos humanos; fonte imutável de verdade | Não direto |
| `exclusions` | Política “nunca sugerir”: deriva de `rejeitado` / `nao-aplicavel` | **Sim** |
| `conventions` | Política “aplicar neste projeto”: promove com **2+** `aceito` no mesmo `finding_key` | **Sim** |

### Detalhes

- `finding_key`: estável por **tema** (não `path:linha`).
- `decisions.finding_id`: opcional FK a `findings`.
- `exclusions.occurrences` / `source`: contagem e origem (`finalize`, `memory-push`).
- `conventions.finding_key` + `occurrences`: upsert por projeto+tema.
- RLS: membro só enxerga projetos com membership; `service_role` bypassa (CI/tooling).

### O que foi avaliado (`review_runs.meta`)

Publish e dual-write gravam cobertura no `meta` do run (sem tabela nova):

| `kind` | Origem | Campos úteis |
| --- | --- | --- |
| `review_coverage` | CI / `review-store-publish` | `files_reviewed`, `reports[]` (arquivo, veredito, #findings), `by_category`, `by_severity`, contagens De/Para/body |
| `finalize_coverage` | chat / dual-write | `files_reviewed`, `by_verdict`, `finding_keys`, contagens written/skipped |

Assim um run **OK com 0 findings** ainda registra quais arquivos/relatórios foram lidos.

### profiles e project_members

Tooling local/CI usa **service_role** e ignora estas tabelas no write path de review.  
O dashboard Next na raiz usa **publishable key + JWT**: `profiles` espelha `auth.users` (trigger), `project_members` decide ACL via RLS. Bootstrap: RPC `claim_project_owner` quando o projeto ainda não tem membros; projetos novos pelo dashboard ganham auto-owner.

**Não** são memória de review (isso é `exclusions` / `conventions`).

## Env

| Variável | Uso |
| --- | --- |
| `SUPABASE_URL` | API REST (obrigatória tooling) |
| `SUPABASE_SERVICE_ROLE_KEY` | Tooling/CI (obrigatória) — nunca no browser |
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard Next.js (resolvido pelo `env:switch`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Dashboard (`sb_publishable_…`) |
| `NEXT_PUBLIC_SUPABASE_TARGET` | `local` \| `cloud` (banner / sync) |
| `SUPABASE_TARGET` | Mesmo target para tooling |
| `SUPABASE_LOCAL_*` / `SUPABASE_CLOUD_*` | Pares URL + publishable + secret |
| `SUPABASE_SECRET_KEY` | Secret ativo (tooling/sync); alias `SUPABASE_SERVICE_ROLE_KEY` |
| `ALLOW_ENV_WRITE` | `1` permite `/settings` gravar `.env` |
| `REVIEW_PROJECT_SLUG` | default monorepo; repos ligados usam basename / `--slug` |

## Relacionados

- [Review store](review-store.md)
- [Código do store](review-store-code.md)
- [Supabase local](supabase-local.md)
