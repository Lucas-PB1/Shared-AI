# Pacote Code Review — layout

```text
packages/code-review/
├── bin/                 # CLIs TypeScript (tsx)
├── src/                 # domínio TypeScript
│   ├── finding-ids.ts
│   ├── markers.ts       # avaliar-inline, De/Para
│   ├── snippets.ts      # normalizeCodeSnippet (única)
│   ├── dotenv.ts
│   ├── pr-report.ts
│   ├── memoria-core.ts
│   ├── memoria.ts
│   ├── ingest-decisions.ts
│   └── store/
├── tests/
├── tools/
│   ├── _tsx.sh          # resolve monorepo + tsx (DRY wrappers)
│   ├── *.sh
│   ├── review-llm.mjs
│   └── review-skill-routing.mjs
└── tsconfig.json
```

## Princípios (clean / SOLID / DRY)

| Princípio | No código |
| --- | --- |
| **SRP** | pr-report / ingest / store / memoria-core com responsabilidades distintas |
| **DRY** | snippets + markers + dotenv; hooks-platform + json-io em cursor; `_tsx.sh` |
| **IDs únicos** | `stableFindingId` (tema do achado, sem path/linha) |

## Scripts raiz

```bash
npm run review:store-smoke
npm run test:review-unit
npm run lint:ts
```

Store: [docs/supabase-local.md](../../docs/supabase-local.md).  
Plano: [docs/PLANO-REVIEW-UNIFICADO.md](../../docs/PLANO-REVIEW-UNIFICADO.md).
