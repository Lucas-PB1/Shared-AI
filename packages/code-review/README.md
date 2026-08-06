# Pacote Code Review

Instalado com `npm run setup:code-review` (inclui `npm install` + `composer install`).

Commands: `/avaliar`, `/avaliar-diff`, `/finalizar`, `/memoria`, `/skills-why`.

Memória por projeto: `.cursor/review/` (gitignored) — **só v2** (`decisions.jsonl`, `context.yaml`, `convencoes.md`). Scaffold/migração residual: `/memoria migrar --write` (remove `memoria.md`).

Diagnóstico: `npm run doctor`.

CI GitLab: [ci/README.md](ci/README.md) — job `hostdime-review` com paridade ao `review-check.sh`.

CI GitHub: [ci/README.md](ci/README.md) — workflow `/avaliar` automático (`review-github-pr.sh`) com comentários por arquivo no PR.

Bootstrap do projeto: `npm run bootstrap -- <repo>`.
