#!/usr/bin/env bash
# Instala pacote code-review (commands, skills review, ferramentas) em ~/.cursor/
# Uso: npm run setup:code-review
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"

# shellcheck disable=SC1091
source "$MONOREPO_ROOT/packages/cursor/scripts/lib/install/install-packages.sh"

echo "Code review — instalando em $CURSOR_DIR"
echo ""

install_code_review_package "$MONOREPO_ROOT"

echo ""
echo "Code review instalado."
echo "Próximo: npm run bootstrap -- /caminho/do/seu/repo"
