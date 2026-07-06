# Pacote Code Review

Instalado com `npm run setup:code-review` (inclui `npm install` + `composer install`).

Commands: `/avaliar`, `/avaliar-diff`, `/finalizar`, `/memoria`, `/skills-why`.

Memória por projeto: `.cursor/review/` (gitignored). v1: `memoria.md`; v2 opt-in via `/memoria migrar`.

Diagnóstico: `npm run doctor`.

CI GitLab: [ci/README.md](ci/README.md) — job `hostdime-review` com paridade ao `review-check.sh`.

Bootstrap do projeto: `npm run bootstrap -- <repo>`.
