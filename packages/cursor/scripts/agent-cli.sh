#!/usr/bin/env bash
# Wrapper hostdime para Cursor CLI — prepara review/ do projeto antes de rodar agent.
# Uso: npm run agent -- [args...]
#      npm run agent -- --project=/path "prompt"
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"

if [[ -f "$SCRIPT_DIR/lib/cursor-cli.sh" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/lib/cursor-cli.sh"
elif [[ -f "$CURSOR_DIR/hostdime-cursor-cli.sh" ]]; then
  # shellcheck disable=SC1091
  source "$CURSOR_DIR/hostdime-cursor-cli.sh"
else
  echo "Erro: lib cursor-cli.sh não encontrada" >&2
  exit 1
fi

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
Uso: agent-cli.sh [--project=PATH] [--dry-run] [--] [args do agent...]

Antes de executar agent:
  - resolve a raiz do projeto (.cursor/ subindo diretórios)
  - prepara review/ via link-project (como sessionStart da IDE)

Exemplos:
  npm run agent
  npm run agent -- "refatorar módulo auth"
  npm run agent -- -p --force "fix lint"
  npm run agent -- --project=/caminho/do/repo resume
EOF
  exit 0
fi

cursor_cli_run_agent "$@"
