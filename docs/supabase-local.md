# Supabase local (Docker)

Ambiente de desenvolvimento do **review store**. Não é produção e não guarda dados reais de clientes no git.

## Pré-requisitos

- Docker rodando
- Node ≥ 20 (CLI via `npx supabase`)

## Subir / parar

```bash
cd /caminho/hostdime-ia
npm run supabase:start    # primeira vez baixa imagens (pode demorar)
npm run supabase:status
npm run supabase:stop
npm run supabase:reset    # recria schema + seed
```

## URLs padrão

| Serviço | URL |
| --- | --- |
| API / REST | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Mailpit | http://127.0.0.1:54324 |

Chaves **demo** (só local): `npm run supabase:status` (campos `ANON_KEY`, `SERVICE_ROLE_KEY`).

## Env para tooling

Copie [.env.example](../.env.example) → `.env` (gitignored) e preencha com `supabase status`, ou exporte na shell:

```bash
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY='…service_role do status…'
export REVIEW_PROJECT_SLUG=hostdime-ia
npm run review:store-smoke   # tsx: packages/code-review/bin/review-store-smoke.ts
```

Cliente do store: `packages/code-review/src/store/` (Node ESM). Ver [STRUCTURE.md](../packages/code-review/STRUCTURE.md).

Com `service_role` o smoke **bypassa RLS** (uso de tooling/CI). Em produção multi-user preferir JWT de membro + RLS.

## Schema / seed

| Artefato | Conteúdo |
| --- | --- |
| `supabase/migrations/*.sql` | DDL + RLS (versionado) |
| `supabase/seed.sql` | projects/demo fictícios |
| `supabase/config.toml` | portas e serviços do stack Docker |

## Privacidade

- Findings com código de clientes → só no DB (local ou cloud privado)
- Nunca commitar dump SQL cheio ou `.env` com keys de cloud

Ver [PLANO-REVIEW-UNIFICADO.md](PLANO-REVIEW-UNIFICADO.md).
