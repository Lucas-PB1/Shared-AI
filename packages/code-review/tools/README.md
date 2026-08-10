# Ferramentas de review

| Script | Uso |
| --- | --- |
| `~/.cursor/review-check.sh` | Análise estática de um arquivo (Semgrep, PHPStan, ESLint, tsc) |
| `~/.cursor/review-diff.sh` | Lista arquivos alterados revisáveis (`/avaliar-diff`) |
| `review-ci.sh` | Review estático em arquivos do diff (CI / local) |
| `review-pre-commit.sh` | Review estático só nos **staged** (git hook — sem LLM) |
| `install-pre-commit.sh` | Instala `.git/hooks/pre-commit` no projeto |
| `~/.cursor/review-github-pr.sh` | /avaliar automático no GitHub — estático + LLM |
| `review-llm.mjs` | Gera relatório /avaliar via LLM |
| `review-skill-routing.mjs` | Resolve skills/rules por path do arquivo |
| `review-export-exclusions.sh` | Exporta exclusions.yaml do context.yaml |
| `review-ingest-pr-decisions.py` | CLI ingest pós-merge (gh) → memória v2 |
| `review-memoria.py` | CLI memória v2 (migrar / compactar / promover / finding-id) |
| `~/.cursor/review-finalizar.sh` | Empacota resultado (`/finalizar`) |

## Libs puras (`lib/`)

| Módulo | Responsabilidade |
| --- | --- |
| `lib/finding_ids.py` | `slugify`, `extract_finding_theme`, `stable_finding_id` |
| `lib/ingest_decisions.py` | Regras de classify, parsers De/Para, `upsert_pr_decisions` |
| `lib/pr_report.py` | Veredito, prioridade da tabela do resumo PR, markers, snippets |
| `lib/memoria_core.py` | Escopos, convencoes, merge de decisões → context |
| `review-pr-report.py` | CLI fina sobre `lib/pr_report` (chamada pelo shell) |

Import: colocar `packages/code-review/tools` no `sys.path` (os CLIs já fazem isso).

## Testes unitários (sem rede / sem `gh`)

```bash
npm run test:review-unit
# python: ingest, pr_report, memoria_core
# node:   skill-routing, llm helpers
```

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
