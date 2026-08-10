# Pacote Code Review

Instalado com `npm run setup:code-review` (inclui `npm install` + `composer install`).

**Organização:** núcleo em **TypeScript** (`src/`, `bin/` via tsx). Shell em `tools/`. Ver [STRUCTURE.md](STRUCTURE.md).

Commands: `/avaliar`, `/avaliar-diff`, `/finalizar`, `/memoria`, `/skills-why`.

**Análise estática por extensão** (`check-inbox.sh` → `~/.cursor/review-check.sh`): PHP, JS/TS via Semgrep + linters acima. CSS e demais stacks: Semgrep auto + skills/rules/convencoes injetados no LLM (sem linter CSS no pacote).

Memória por projeto: `.cursor/review/` (gitignored) — `decisions.jsonl`, `context.yaml`, `convencoes.md`. Scaffold: `/memoria init --write`.

Diagnóstico: `npm run doctor`.

CI GitLab: [ci/README.md](ci/README.md) — job `hostdime-review` com paridade ao `review-check.sh`.

CI GitHub: [ci/README.md](ci/README.md) — `/avaliar` automático no PR (Fase 2: estático + LLM).

Bootstrap do projeto: `npm run bootstrap -- <repo>`.
