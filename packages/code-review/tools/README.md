# Ferramentas de review

| Script | Uso |
| --- | --- |
| `~/.cursor/review-check.sh` | Análise estática de um arquivo |
| `~/.cursor/review-diff.sh` | Lista arquivos alterados revisáveis (`/avaliar-diff`) |
| `~/.cursor/review-ci.sh` | Review estático em arquivos do diff (CI / local) |
| `~/.cursor/review-finalizar.sh` | Empacota resultado (`/finalizar`) |

Deps Node/PHP ficam na **raiz do hostdime-ia** — um único `npm run setup`.

```bash
~/.cursor/review-check.sh src/Foo.php
~/.cursor/review-diff.sh main
HOSTDIME_IA_ROOT=/caminho/hostdime-ia ~/.cursor/review-ci.sh main
```
