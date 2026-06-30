#!/usr/bin/env bash
# Instala pacote skills (rules, skills cursor, motor) em ~/.cursor/
# Uso: npm run setup:skills
set -euo pipefail

INSTALL_HOOKS=0
if [[ "${1:-}" == "--hooks" ]]; then
  INSTALL_HOOKS=1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CURSOR_PKG="$MONOREPO_ROOT/packages/cursor"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/link-from-repo.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/hostdime-env.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/install-packages.sh"

echo "Skills — instalando em $CURSOR_DIR"
echo ""

install_skills_package "$MONOREPO_ROOT"
install_hooks_if_requested "$INSTALL_HOOKS" "$CURSOR_PKG"

echo ""
echo "Skills instaladas."
echo "Próximo: npm run bootstrap -- /caminho/do/seu/repo"
