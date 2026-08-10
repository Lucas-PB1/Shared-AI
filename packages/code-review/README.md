# Pacote Code Review

Instalado com `npm run setup:code-review` (inclui `npm install` + `composer install`).

**Organização:** TypeScript em `src/` + `bin/` (tsx); bash em `tools/sh/`. Ver [STRUCTURE.md](STRUCTURE.md) e [docs/okf/review-store.md](../../docs/okf/review-store.md).

Commands: `/avaliar`, `/avaliar-diff`, `/finalizar`, `/memoria`, `/skills-why`.

**Estático** (`check-inbox.sh` → `~/.cursor/review-check.sh`): PHP, JS/TS (Semgrep + linters). CSS e outras stacks: Semgrep + skills no LLM.

**Memória oficial:** store Supabase (obrigatório). Rascunhos opcionais em workdir tmp (`HOSTDIME_REVIEW_WORKDIR` / `$TMPDIR/hostdime-review/<hash>`).

Diagnóstico: `npm run doctor`.

CI: [ci/README.md](ci/README.md) — GitHub `/avaliar` no PR; GitLab `hostdime-review`.

Bootstrap do projeto: `npm run bootstrap -- <repo>`.
