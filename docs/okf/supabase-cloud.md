---
type: Playbook
title: Supabase cloud (HostDime)
description: Go-live do store hospedado e secrets nos repos cliente.
tags: [store, supabase, cloud, playbook]
timestamp: 2026-08-10T16:00:00Z
---

## Contexto

Projeto Supabase da org HostDime. Contrato: [Review store](review-store.md). Dev local primeiro: [Supabase local](supabase-local.md).

## Checklist

1. Criar projeto Supabase (região adequada).
2. Aplicar migrations (`supabase db push` ou SQL Editor).
3. Seed: row em `projects` por repo (`REVIEW_PROJECT_SLUG`).
4. Auth: `profiles` + `project_members`.
5. Secrets:

   | Onde | Chave |
   | --- | --- |
   | GitHub (repos cliente) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (**obrigatórios**) |
   | Variable | `REVIEW_PROJECT_SLUG` (ex. `hostdime-hub`) |
   | Dev `.env` | mesma URL + service role (tooling) |

6. Service role **só** em CI/tooling — nunca no browser público.

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
