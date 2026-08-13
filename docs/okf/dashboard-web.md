---
type: Playbook
title: Dashboard web (Next.js)
description: App Next.js na raiz — Auth Supabase JWT, membership e review runs.
tags: [dashboard, nextjs, auth, supabase]
timestamp: 2026-08-13T14:00:00Z
---

## Onde vive

Na **raiz** do monorepo (`app/`, `src/`, `middleware.ts`) — Next.js App Router + Feature-Sliced Design, convivendo com `packages/cursor` e `packages/code-review`.  
Service role **não** entra no browser (só anon key + JWT).

## Pré-requisitos

1. Schema com migration `20260813140000_dashboard_auth.sql` aplicada (`npm run supabase:reset` **só no Docker local**; no cloud use `npm run supabase:db-push` — nunca reset remoto).
2. No [`.env`](../../.env.example) da raiz:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Sem confirmação de e-mail:**
   - Local: [`supabase/config.toml`](../../supabase/config.toml) → `[auth.email] enable_confirmations = false`
   - Cloud: Dashboard → Authentication → Providers → Email → **Confirm email OFF**

## Comandos

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

Aliases: `dev:web` / `build:web` / `start:web`.

## Fluxo

| Rota | Papel |
| --- | --- |
| `/signup`, `/login` | Auth e-mail/senha (sessão cookie via `@supabase/ssr`) |
| `/` | Projetos do membership + claim de projetos sem owner |
| `/projects/[slug]` | Membros (owner convida por e-mail) + `review_runs` |
| `/account` | `profiles.display_name` |

Primeiro owner de um projeto seedado: botão **Reivindicar** (RPC `claim_project_owner`).  
Convite: a pessoa precisa já ter conta (`profiles.email`).

## Relacionados

- [Schema](review-store-schema.md)
- [Supabase cloud](supabase-cloud.md)
- [Supabase local](supabase-local.md)
