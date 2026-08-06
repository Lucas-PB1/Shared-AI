# Ferramentas de review

| Script | Uso |
| --- | --- |
| `~/.cursor/review-check.sh` | Análise estática de um arquivo |
| `~/.cursor/review-diff.sh` | Lista arquivos alterados revisáveis (`/avaliar-diff`) |
| `~/.cursor/review-ci.sh` | Review estático em arquivos do diff (CI / local) |
| `~/.cursor/review-github-pr.sh` | /avaliar automático no GitHub — estático + LLM |
| `review-llm.mjs` | Gera relatório /avaliar via LLM |
| `review-export-exclusions.sh` | Exporta exclusions.yaml do context.yaml |
| `~/.cursor/review-finalizar.sh` | Empacota resultado (`/finalizar`) |

Deps Node/PHP ficam na **raiz do hostdime-ia** — um único `npm run setup`.

```bash
~/.cursor/review-check.sh src/Foo.php
~/.cursor/review-diff.sh main
HOSTDIME_IA_ROOT=/caminho/hostdime-ia ~/.cursor/review-ci.sh main
PR_NUMBER=42 REVIEW_DIFF_BASE=main HEAD_SHA=HEAD ~/.cursor/review-github-pr.sh
```
