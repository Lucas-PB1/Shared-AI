# Pacote Code Review

Instalado com `npm run setup:code-review` (inclui `npm install` + `composer install`).

Commands `/avaliar`, `/avaliar-diff`, `/finalizar`, skills de review, ferramentas → `~/.cursor/`.

Memória por projeto: `.cursor/review/memoria.md` (gitignored, atualizado no `/finalizar`).

Diagnóstico: `npm run doctor`.

CI GitLab: [ci/README.md](ci/README.md) — job `hostdime-review` com paridade ao `review-check.sh`.

Bootstrap do projeto: `npm run bootstrap -- <repo>`.
