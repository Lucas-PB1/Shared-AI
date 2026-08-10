# tools — code-review

Layout por linguagem (mistura de artefatos):

| Pasta | Conteúdo |
| --- | --- |
| `sh/` | Wrappers bash (`review-ci`, `check-inbox`, `review-github-pr`, …) e `github-pr/` |
| `mjs/` | Config executável ESLint inbox |
| `conf/` | `phpstan-inbox.neon`, `tsconfig-inbox.json` |

Uso típico na raiz do monorepo:

```bash
npm run review:ci
bash packages/code-review/tools/sh/check-inbox.sh path/to/file.ts
```

`sh/_tsx.sh` resolve `HOSTDIME_IA_ROOT` e o binário `tsx`.
