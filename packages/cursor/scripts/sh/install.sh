#!/usr/bin/env bash
# Instala pacote skills (rules, skills cursor, motor) em ~/.cursor/
# Uso: npm run setup:skills
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
CURSOR_PKG="$MONOREPO_ROOT/packages/cursor"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/link-from-repo.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/shared-ai-env.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/install-packages.sh"

echo "Skills — instalando em $CURSOR_DIR"
echo ""

install_skills_package "$MONOREPO_ROOT"

echo ""
echo "Skills instaladas."
echo "Próximo: npm run bootstrap -- /caminho/do/seu/repo"
