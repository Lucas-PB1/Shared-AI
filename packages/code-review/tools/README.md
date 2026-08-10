# Ferramentas de review

Layout e política de linguagem: [../STRUCTURE.md](../STRUCTURE.md).

| Entrada | Uso |
| --- | --- |
| `bin/review-store-smoke.ts` | Smoke do store Supabase (Node/tsx) |
| `bin/review-pr-report.ts` | Helpers puros do review-github-pr |
| `bin/review-memoria.ts` | CLI memória v2 |
| `bin/review-ingest-pr-decisions.ts` | Ingest pós-merge (gh) → memória v2 |
| `~/.cursor/review-check.sh` | Análise estática de um arquivo (Semgrep, PHPStan, ESLint, tsc) |
| `~/.cursor/review-diff.sh` | Lista arquivos alterados revisáveis (`/avaliar-diff`) |
| `review-ci.sh` | Review estático em arquivos do diff (CI / local) |
| `review-pre-commit.sh` | Review estático só nos **staged** (git hook — sem LLM) |
| `install-pre-commit.sh` | Instala `.git/hooks/pre-commit` no projeto |
| `~/.cursor/review-github-pr.sh` | /avaliar automático no GitHub — estático + LLM |
| `review-llm.sh` → `bin/review-llm.ts` | Gera relatório /avaliar via LLM (`src/llm/`) |
| `src/skill-routing/` | Resolve skills/rules por path do arquivo |
| `review-export-exclusions.sh` | Exporta exclusions.yaml do context.yaml |
| `~/.cursor/review-finalizar.sh` | Empacota resultado (`/finalizar`) |

## Código TypeScript (`src/` + `bin/`)

| Módulo | Responsabilidade |
| --- | --- |
| `src/shared/` | Kernel: IDs, markers, snippets, dotenv |
| `src/memory/` | Memória local: paths, YAML, decisions, merge, cmds |
| `src/ingest/` | Threads PR → decisions |
| `src/report/` | Veredito, resumo PR, helpers inline |
| `src/store/` | Port + Supabase + dual-write + publish + memory |
| `bin/review-dual-write.ts` | Replay local → store (pós-/finalizar) |
| `bin/review-store-publish.ts` | CI/local: run + findings dos reports (U2) |
| `bin/review-memory-pull.ts` | Store → exclusions.yaml + convencoes-store.md (U3) |
| `bin/review-memory-push.ts` | exclusions.yaml slim → store (U3) |
| `review-store-publish.sh` / `review-memory-*.sh` | Wrappers `_tsx.sh` |

## Testes unitários

```bash
npm run test:review-unit
# tsx:  packages/code-review/tests/*.test.ts
# TS units: tests/skill-routing, tests/llm (+ memory/ingest/report/store)
npm run lint:ts
```

### Store unificado (Supabase local)

```bash
npm run supabase:start
# export SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (status)
npm run review:store-smoke
```

Plano: [docs/PLANO-REVIEW-UNIFICADO.md](../../../docs/PLANO-REVIEW-UNIFICADO.md).  
Local: [docs/supabase-local.md](../../../docs/supabase-local.md).

Deps Node/PHP ficam na **raiz do hostdime-ia** — um único `npm run setup`.

## Pre-commit (sem LLM)

Alinha o hook local ao gate estático do CI (`check-inbox` + opcional ShellCheck).

```bash
# no projeto alvo (com code-review instalado na máquina)
cd /caminho/do/projeto
HOSTDIME_IA_ROOT=/caminho/hostdime-ia npm --prefix "$HOSTDIME_IA_ROOT" run hooks:pre-commit -- "$(pwd)"

# ou na raiz do hostdime-ia
npm run hooks:pre-commit -- /caminho/do/projeto
npm run hooks:pre-commit -- .          # no próprio hostdime-ia
```

| Ação | Como |
| --- | --- |
| Rodar manual | `npm run pre-commit` (no hostdime-ia) ou o script com stage |
| Pular um commit | `HOSTDIME_SKIP_PRE_COMMIT=1 git commit ...` |
| Limite de arquivos | `HOSTDIME_PRE_COMMIT_MAX_FILES=40` (default) |
| Sem shellcheck | `HOSTDIME_PRE_COMMIT_SHELLCHECK=0` |
| Remover hook | `rm .git/hooks/pre-commit` |

Hook anterior (se não era hostdime) fica em `pre-commit.local` e é encadeado.

```bash
~/.cursor/review-check.sh src/Foo.php
~/.cursor/review-diff.sh main
HOSTDIME_IA_ROOT=/caminho/hostdime-ia ~/.cursor/review-ci.sh main
PR_NUMBER=42 REVIEW_DIFF_BASE=main HEAD_SHA=HEAD ~/.cursor/review-github-pr.sh
```
