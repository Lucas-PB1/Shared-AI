# Pacote Code Review — layout

Fatias (Modular Slices). Store: [docs/okf/review-store.md](../../docs/okf/review-store.md).

## Layout

```text
packages/code-review/
├── bin/                 # thin CLIs → fatia
├── src/
│   ├── shared/
│   ├── memory/
│   ├── ingest/
│   ├── report/
│   ├── store/           # port, dual-write, publish, memory-*, supabase-*
│   ├── skill-routing/
│   └── llm/
├── tools/
│   ├── sh/              # wrappers + github-pr/
│   ├── mjs/
│   └── conf/
├── commands/ skills/ ci/ templates/
└── tests/
```

## Princípios

| Princípio | No código |
| --- | --- |
| **Fatias** | import via `index` / `shared` |
| **Store** | port → supabase-client; **sempre hard** |
| **Dependência** | bin → fatia; store não importa internals de memory |

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

Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REVIEW_PROJECT_SLUG`  
(ver [supabase-local.md](../../docs/okf/supabase-local.md) / [supabase-cloud.md](../../docs/okf/supabase-cloud.md)).
