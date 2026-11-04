# Testes

```bash
npm test              # roda tests/*.test.ts e tests/*.test.mjs (node:test via tsx)
npm run lint:ts       # tsc --noEmit (scripts Cursor + testes)
npm run lint:shell    # ShellCheck (skip suave se não instalado)
```

| Arquivo | Cobre |
| --- | --- |
| `merge-cursor-cli-config.test.ts` | Merge do `cli-config.json` — allowlist padrão, `--unrestricted` opt-in, não sobrescrever escolha do usuário |
| `merge-hooks-json.test.ts` | Merge do `hooks.json` — preserva hooks de terceiros, idempotente, troca entrada do SO errado |
| `projects-registry.test.ts` | Registry de projetos — register idempotente, unregister, prune |
| `routing-log.test.ts` | Append / filtro por projeto / resumo do routing log |
| `routing-log-wrapper.test.mjs` | Wrapper `~/.cursor/shared-ai-routing-log.mjs` rodando de fora do clone |
| `history-watch-match.test.ts` | Matcher de escopos do `/historico` (file / dir / glob) e validação de `watches.json` |
| `ps1-encoding.test.mjs` | `.ps1` com não-ASCII precisa de BOM (Windows PowerShell 5.1) |
| `linked-project-slug.test.ts` | Slug dos repositórios ligados no dashboard |

CI: `.github/workflows/ci.yml` — Linux (typecheck, ESLint, ShellCheck, testes, build) e Windows (testes + parse de todos os `.ps1` no PowerShell 5.1).
