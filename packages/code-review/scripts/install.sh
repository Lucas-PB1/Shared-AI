#!/usr/bin/env bash
# Instala commands e ferramentas de code review em ~/.cursor/
# Uso: npm run setup:code-review
set -euo pipefail

REVIEW_PKG="$(cd "$(dirname "$0")/.." && pwd)"
MONOREPO_ROOT="$(cd "$REVIEW_PKG/../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"

echo "Code review — instalando em $CURSOR_DIR"
echo ""

mkdir -p "$CURSOR_DIR"/{skills,commands}

echo "→ skills (review)"
rsync -a "$REVIEW_PKG/skills/" "$CURSOR_DIR/skills/"

echo "→ commands (/avaliar, /finalizar)"
rsync -a "$REVIEW_PKG/commands/" "$CURSOR_DIR/commands/"

echo "→ hostdime-ia.env"
cat >"$CURSOR_DIR/hostdime-ia.env" <<EOF
HOSTDIME_IA_ROOT=$MONOREPO_ROOT
EOF

echo "→ ferramentas"
install -m 755 "$REVIEW_PKG/tools/check-inbox.sh" "$CURSOR_DIR/review-check.sh"
install -m 755 "$REVIEW_PKG/tools/finalizar-review.sh" "$CURSOR_DIR/review-finalizar.sh"

echo ""
echo "Code review instalado."
echo "Requer deps: npm install && composer install (raiz do hostdime-ia)"
echo "Próximo: npm run bootstrap -- /caminho/do/seu/repo"
