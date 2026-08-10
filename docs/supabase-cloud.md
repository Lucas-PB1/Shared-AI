# Supabase cloud (HostDime)

Setup do **review store** em projeto Supabase Hospedado (não local Docker).  
Schema e código: monorepo `hostdime-ia`. **Dados de review e secrets de produção não vão no git.**

## Contrato

**Store sempre obrigatório.** Pull, publish, dual-write, LLM memory e `/finalizar` falham sem `SUPABASE_URL` + chave. Não há modo offline.

## Checklist de go-live

1. Criar projeto Supabase (org HostDime), região adequada.
2. Aplicar migrations: `supabase db push` apontando ao remote (ou SQL Editor com `supabase/migrations/*.sql`).
3. Seed mínimo: row em `projects` com `slug` do repo (`REVIEW_PROJECT_SLUG`) e `github_owner`/`github_repo` se útil.
4. Auth multi-user:
   - Devops entra via **email/SSO** configurado no Supabase Auth.
   - Inserir `profiles` (espelho de `auth.users`) + `project_members` (`owner` / `member` / `viewer`).
5. Secrets:
   | Onde | Chave |
   | --- | --- |
   | GitHub Actions (repos alvo) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (**obrigatórios**) |
   | Variable | `REVIEW_PROJECT_SLUG` |
   | Dev local `.env` (gitignored) | mesma URL + service role (tooling) |
6. **Service role** só em CI/tooling controlado — nunca em app pública do browser.

## Multi-usuário e RLS

- Policies em `authenticated`: somente membros de `project_members`.
- `service_role`: bypass (CI + tooling).
- Dashboard mínimo v1: **Supabase Studio** filtrando por `project_id` / `slug`.

## Drivers

| Comando | Papel |
| --- | --- |
| `npm run review:memory-pull` | exclusions/conventions → cache local |
| `npm run review:store-publish` | CI run + findings |
| `npm run review:dual-write` | decisões → store |
| `npm run review:memory-push` | cache exclusions slim → store |

Workflow: `packages/code-review/ci/github-avaliar-pr.yml` (pull → /avaliar → publish).

## Privacidade

- Snippets em `findings` / `decisions` meta **só no DB privado**.
- Cache local em `.cursor/review/` é efêmero (gitignored nos repos alinados a store-only).
- Nunca commitar dump de produção nem service keys no hostdime-ia.

Ver também: [supabase-local.md](supabase-local.md), [PLANO-REVIEW-UNIFICADO.md](PLANO-REVIEW-UNIFICADO.md).
