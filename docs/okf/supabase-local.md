---
type: Playbook
title: Supabase local (Docker)
description: Subir o stack de auth do dashboard em Docker.
tags: [supabase, local, playbook]
timestamp: 2026-09-10T16:00:00Z
---

## Contexto

Ambiente de **desenvolvimento** (Docker). Auth + `profiles` + bucket `avatars`.

Schema: `supabase/migrations/20260910160000_init.sql`. Para recriar o banco:

```bash
npm run supabase:reset
```

## Pré-requisitos

- Docker rodando
- Node ≥ 20 (`npx supabase`)

## Subir / parar

```bash
cd /caminho/shared-ai
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

Chaves demo: `npm run supabase:status`.

## Env

```bash
cp .env.example .env
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
```

## Relacionados

- [Dashboard web](dashboard-web.md)
