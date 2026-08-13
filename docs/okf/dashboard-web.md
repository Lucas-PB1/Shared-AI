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

Pares no [`.env`](../../.env.example):

| Prefixo | Uso |
| --- | --- |
| `SUPABASE_LOCAL_*` | Docker (`PUBLISHABLE`/`SECRET`; local ainda pode ser JWT) |
| `SUPABASE_CLOUD_*` | HostDime cloud (`sb_publishable_` / `sb_secret_`) |
| `SUPABASE_TARGET` | `local` \| `cloud` |

```bash
npm run env:switch -- local --refresh-keys
npm run env:switch -- cloud --refresh-keys
# depois reinicie
npm run dev
```

O script resolve só keys **publishable/secret**. Alias `SUPABASE_SERVICE_ROLE_KEY` (= secret) permanece para CLIs/CI.

## Permissões

| Nível | Escopo |
| --- | --- |
| `viewer` | Lê projeto/runs |
| `member` | + escreve runs/decisions |
| `owner` | + convida/gerencia members |
| `profiles.is_admin` | + `/settings`, sync cloud→local |

## Config na UI

Rota `/settings` (só admin):

- Trocar target local/cloud (grava `.env` se `ALLOW_ENV_WRITE=1`)
- Atualizar URLs / publishable / secret dos pares
- **Sincronizar do remoto** (só com target `local`): projects, exclusions, conventions, memberships por e-mail

Reinicie o Next após mudar `NEXT_PUBLIC_*`.

## Auth

- Local: `enable_confirmations = false` no config.toml
- Cloud: Confirm email **OFF** no dashboard Auth

## Relacionados

- [Schema](review-store-schema.md)
- [Supabase cloud](supabase-cloud.md)
- [Supabase local](supabase-local.md)
