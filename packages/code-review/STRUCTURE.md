# Pacote Code Review — layout

Arquitetura: **[Modular Slices](../../docs/PLANO-MODULAR-SLICES.md)**.  
Store: [PLANO-REVIEW-UNIFICADO](../../docs/PLANO-REVIEW-UNIFICADO.md).

## Estado atual (S1–S6)

```text
packages/code-review/
├── bin/                 # thin CLIs → fatia
├── src/
│   ├── shared/
│   ├── memory/
│   ├── ingest/            # extract, git, fix, classify, decisions
│   ├── report/
│   ├── store/             # open, dual-write, publish, memory-*, supabase-*
│   ├── skill-routing/
│   └── llm/
├── tools/
│   ├── github-pr/         # módulos bash do CI /avaliar (soft ≤200L)
│   └── review-github-pr.sh
```

## Princípios

| Princípio | No código |
| --- | --- |
| **Modular Slices** | import via `index` / `shared` |
| **Store** | port → supabase-client; dual-write soft se env configurado |
| **Dependência** | bin/ingest → store; store **não** importa memory (só shapes) |

## Scripts

```bash
npm run review:store-smoke
npm run review:dual-write -- [project]
npm run review:store-publish -- --project .
npm run review:memory-pull -- .
npm run review:memory-push -- .
npm run test:review-unit
npm run lint:ts
```

### Store env

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REVIEW_PROJECT_SLUG`  
Hard: `REVIEW_STORE_REQUIRED=1` (U4). Ver [docs/supabase-cloud.md](../../docs/supabase-cloud.md).
