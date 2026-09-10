---
type: Playbook
title: Dashboard web (Next.js)
description: App Next.js na raiz — Auth no Supabase local e lista de repositórios ligados.
tags: [dashboard, nextjs, auth, supabase]
timestamp: 2026-09-10T16:00:00Z
---

## Onde vive

Na **raiz** (`app/`, `src/`, `middleware.ts`) — FSD + tokens Shared AI.  
Service role **nunca** no browser.

## Propósito

Quem está logado no stack **Docker local** vê os repositórios registrados em `~/.cursor/shared-ai/projects.json` (bootstrap do Cursor). Remover do dashboard só tira o path do JSON; `npm run detach` remove os symlinks.

## Subir

```bash
npm run setup              # .env vazio + npm install
npm run supabase:start
# copie URL e keys de npm run supabase:status para o .env
npm run dev                # http://localhost:3000
```

`.env`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.

## Auth

- Local: `enable_confirmations = false` no config.toml
- Qualquer usuário autenticado lê o registry desta máquina

## Relacionados

- [Supabase local](supabase-local.md)
