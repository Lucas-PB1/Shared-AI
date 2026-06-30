# Ferramentas de review

Análise estática usada por `~/.cursor/review-check.sh` (instalado via `npm run setup`).

Deps Node/PHP ficam **só na raiz do hostdime-ia** — um único `npm install` + `composer install`.

## Uso

```bash
# Da raiz do hostdime-ia (dev)
npm run review:check -- .cursor/review/inbox/foo.php

# Em qualquer projeto (após setup)
~/.cursor/review-check.sh .cursor/review/inbox/foo.php
```

## O que roda

| Camada | PHP | JS | TS |
| --- | --- | --- | --- |
| Semgrep | sim | sim | sim |
| Sintaxe | `php -l` | `node --check` | — |
| Lint/tipos | PHPStan 6 | ESLint 9 | ESLint + `tsc --strict` |
