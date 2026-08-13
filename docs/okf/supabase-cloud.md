---
type: Playbook
title: Supabase cloud (HostDime)
description: Go-live do store hospedado e secrets nos repos cliente.
tags: [store, supabase, cloud, playbook]
timestamp: 2026-08-10T20:10:00Z
---

## Projeto

| Campo | Valor |
| --- | --- |
| **Ref** | `toekmpljxeulcquqhkxt` |
| **API URL** | `https://toekmpljxeulcquqhkxt.supabase.co` |
| **Dashboard** | [Project → toekmpljxeulcquqhkxt](https://supabase.com/dashboard/project/toekmpljxeulcquqhkxt) |
| **Studio / Table Editor** | [Editor](https://supabase.com/dashboard/project/toekmpljxeulcquqhkxt/editor) |
| **API keys** | [Settings → API](https://supabase.com/dashboard/project/toekmpljxeulcquqhkxt/settings/api) |

Dev local opcional: [Supabase local](supabase-local.md). Contrato: [Review store](review-store.md).

## Estado

| Item | Status |
| --- | --- |
| Schema (migrations + evolve) | aplicado no cloud |
| Dados do review store | sincronizados com o Docker local (fonte inicial: local → remote) |
| Monorepo `.env` | aponta para este projeto cloud |
| Secrets GitHub (repos cliente) | pendente por repositório |

## Checklist (go-live / re-sync)

1. Conta com acesso ao projeto (org HostDime / GitHub).
2. Monorepo `.env`:
   - `SUPABASE_URL=https://toekmpljxeulcquqhkxt.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=` (Settings → API → **service_role** legada ou secret key)
3. Schema (se DB vazio):
   - **CLI** (conta com privilege): `npm run supabase:link` → `npm run supabase:db-push`
   - **ou SQL Editor:** migrations na ordem, depois seed se precisar
4. Smoke: `npm run review:store-smoke`
5. Secrets nos **repos cliente** (GitHub):

   | Onde | Chave |
   | --- | --- |
   | GitHub secrets | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (**obrigatórios**) |
   | Variable | `REVIEW_PROJECT_SLUG` (ex. `hostdime-hub`) |
   | Dev `.env` monorepo | mesma URL + service role |

6. Service role **só** em CI/tooling — nunca no browser público.
7. Dashboard Next (`npm run dev:web`): preencher `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`; em **Authentication → Providers → Email** desligar **Confirm email**. Ver [Dashboard web](dashboard-web.md).
8. **Nunca** `db reset` no cloud — só `db push` para schema. Reset é exclusivo do Docker local.

## CLI

```bash
# login com a conta que tem acesso ao projeto HostDime
npx supabase login

npm run supabase:link      # --project-ref toekmpljxeulcquqhkxt
npm run supabase:db-push   # aplica migrations remotas
```

Se o CLI retornar *access-control* / *privileges*, a sessão atual é de **outra conta** (ex. pessoal). Faça login na org HostDime ou aplique SQL pelo dashboard.

## Drivers

| Comando | Papel |
| --- | --- |
| `npm run review:memory-pull` | store → cache local |
| `npm run review:store-publish` | run + findings |
| `npm run review:dual-write` | decisions → store |
| `npm run review:memory-push` | cache exclusions → store |

Template CI: `packages/code-review/ci/github-avaliar-pr.yml`.

## Relacionados

- [Review store](review-store.md)
- [Schema](review-store-schema.md)
- [Local](supabase-local.md)
