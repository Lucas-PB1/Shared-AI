---
type: Playbook
title: Supabase local (Docker)
description: Subir o review store em Docker, env e smoke no monorepo.
tags: [store, supabase, local, playbook]
timestamp: 2026-08-10T16:00:00Z
---

## Contexto

Ambiente de **desenvolvimento** do store (Docker). Ops/cloud HostDime: [Supabase cloud](supabase-cloud.md) (`toekmpljxeulcquqhkxt`). Sem dados de clientes no git.

## Pré-requisitos

- Docker rodando
- Node ≥ 20 (`npx supabase`)

## Subir / parar

```bash
cd /caminho/hostdime-ia
npm run supabase:start
npm run supabase:status
npm run supabase:stop
npm run supabase:reset    # schema + seed
```

## URLs

| Serviço | URL |
| --- | --- |
| API / REST | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Mailpit | http://127.0.0.1:54324 |

Chaves demo: `npm run supabase:status` (`SERVICE_ROLE_KEY`).

## Env

```bash
cp .env.example .env
# SUPABASE_SERVICE_ROLE_KEY do status
# REVIEW_PROJECT_SLUG=hostdime-ia | hostdime-hub | …

npm run review:store-smoke
```

## Artefatos

| Artefato | Conteúdo |
| --- | --- |
| `supabase/migrations/*.sql` | DDL + RLS |
| `supabase/seed.sql` | projects de demo |
| `supabase/config.toml` | portas locais |

## Relacionados

- [Review store](review-store.md)
- [Schema](review-store-schema.md)
- [Cloud](supabase-cloud.md)
