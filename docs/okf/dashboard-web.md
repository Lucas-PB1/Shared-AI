---
type: Playbook
title: Dashboard web (Next.js)
description: App Next.js na raiz — Auth, membership, switch local/cloud e sync.
tags: [dashboard, nextjs, auth, supabase]
timestamp: 2026-08-13T18:30:00Z
---

## Onde vive

Na **raiz** (`app/`, `src/`, `middleware.ts`) — FSD + tokens HostDime.  
Service role **nunca** no browser.

## Ambientes (switch)

Pares em tabelas `app_connections` + `app_settings` (UI `/settings`).  
`.env` só bootstrap (`NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_SECRET_KEY`).

```bash
npm run setup                                # .env vazio + npm install
npm run env:switch -- local --refresh-keys   # preenche bootstrap do .env
npm run connections:seed                     # grava/espelha tabela local+cloud
npm run dev
```

Target ativo: cookie + `app_settings` (sem reescrever `.env` pela UI). Botão **Testar conexão** valida auth/health + REST.

## Permissões

| Nível | Escopo |
| --- | --- |
| `viewer` | Lê projeto/runs |
| `member` | + escreve runs/decisions |
| `owner` | + convida/gerencia members |
| `profiles.is_admin` | + `/settings`, sync cloud→local |

## Config na UI

Rota `/settings` (só admin):

- Trocar target local/cloud (`app_settings` + cookies)
- Salvar URL / publishable / secret em `app_connections` (espelha nos dois DBs)
- **Testar conexão** (local e cloud)
- **Sincronizar do remoto** (só com target `local`)
## Auth

- Local: `enable_confirmations = false` no config.toml
- Cloud: Confirm email **OFF** no dashboard Auth

## Relacionados

- [Schema](review-store-schema.md)
- [Supabase cloud](supabase-cloud.md)
- [Supabase local](supabase-local.md)
