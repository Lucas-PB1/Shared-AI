# Supabase cloud (HostDime) — U4

Setup do **review store** em projeto Supabase Hospedado (não local Docker).  
Schema e código: monorepo `hostdime-ia`. **Dados de review e secrets de produção não vão no git.**

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
   | GitHub Actions (repos alvo) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
   | Variable | `REVIEW_PROJECT_SLUG`, opcional `REVIEW_STORE_REQUIRED=true` |
   | Dev local `.env` (gitignored) | mesma URL + **service role só se política permitir**; preferir JWT de membro no futuro |
6. **Service role** só em CI/tooling controlado — nunca em app pública do browser.
7. Hard unification (opcional por repo): `REVIEW_STORE_REQUIRED=true`  
   - dual-write / publish falham o job se store down  
   - default soft: arquivo local + skip store se offline

## Multi-usuário e RLS

- Policies em `authenticated`: somente membros de `project_members`.
- `service_role`: bypass (CI + smoke).
- Dashboard mínimo v1: **Supabase Studio** filtrando por `project_id` / `slug`. Página interna HostDime fica fora do monorepo.

## Drivers (já no monorepo)

| Comando | Papel |
| --- | --- |
| `npm run review:memory-pull` | exclusions/conventions → `.cursor/review/` |
| `npm run review:store-publish` | CI run + findings |
| `npm run review:dual-write` | decisões jsonl → store |
| `npm run review:memory-push` | exclusions.yaml slim → store |

Workflow template: `packages/code-review/ci/github-avaliar-pr.yml` (pull → /avaliar → publish).

## Hard vs soft

| Modo | Quando | Comportamento |
| --- | --- | --- |
| Soft (default) | sem `REVIEW_STORE_REQUIRED` | review e finalize funcionam offline |
| Hard | `REVIEW_STORE_REQUIRED=1` | write store é obrigatório se o fluxo o invoca |

## Privacidade

- Snippets em `findings` / `decisions` meta **só no DB privado**.
- Export versionável no git do **cliente**: `exclusions.yaml` slim (finding_key + reason + scope).
- Nunca commitar dump de produção nem service keys no hostdime-ia.

Ver também: [supabase-local.md](supabase-local.md), [PLANO-REVIEW-UNIFICADO.md](PLANO-REVIEW-UNIFICADO.md).
