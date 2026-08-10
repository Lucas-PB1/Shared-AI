# Ferramentas de review

| Script | Uso |
| --- | --- |
| `~/.cursor/review-check.sh` | Análise estática de um arquivo (Semgrep, PHPStan, ESLint, tsc) |
| `~/.cursor/review-diff.sh` | Lista arquivos alterados revisáveis (`/avaliar-diff`) |
| `~/.cursor/review-ci.sh` | Review estático em arquivos do diff (CI / local) |
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

Import: colocar `packages/code-review/tools` no `sys.path` (os CLIs já fazem isso).

## Testes unitários (sem rede / sem `gh`)

```bash
npm run test:review-unit
# ou
python3 packages/code-review/tools/tests/test_ingest_and_ids.py
```

Inclui regressões: reply humano rejeita/aceita, re-ingest substitui `github-pr-N`, fix intra-PR, `finding_id` estável sem path.

Deps Node/PHP ficam na **raiz do hostdime-ia** — um único `npm run setup`.

```bash
~/.cursor/review-check.sh src/Foo.php
~/.cursor/review-diff.sh main
HOSTDIME_IA_ROOT=/caminho/hostdime-ia ~/.cursor/review-ci.sh main
PR_NUMBER=42 REVIEW_DIFF_BASE=main HEAD_SHA=HEAD ~/.cursor/review-github-pr.sh
```
