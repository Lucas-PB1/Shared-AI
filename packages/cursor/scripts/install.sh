#!/usr/bin/env bash
# Instala rules, skills e automação Cursor em ~/.cursor/
# Uso: npm run setup:skills
set -euo pipefail

INSTALL_HOOKS=0
if [[ "${1:-}" == "--hooks" ]]; then
  INSTALL_HOOKS=1
fi

CURSOR_PKG="$(cd "$(dirname "$0")/.." && pwd)"
MONOREPO_ROOT="$(cd "$CURSOR_PKG/../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"

echo "Skills — instalando em $CURSOR_DIR"
echo ""

mkdir -p "$CURSOR_DIR"/{rules,skills,hooks}

echo "→ rules (orquestrador)"
rsync -a "$CURSOR_PKG/rules/" "$CURSOR_DIR/rules/"

echo "→ skills"
rsync -a "$CURSOR_PKG/skills/" "$CURSOR_DIR/skills/"

echo "→ SKILLS-ROUTING.md"
cp "$CURSOR_PKG/docs/SKILLS-ROUTING.md" "$CURSOR_DIR/"

echo "→ hostdime-ia.env"
cat >"$CURSOR_DIR/hostdime-ia.env" <<EOF
HOSTDIME_IA_ROOT=$MONOREPO_ROOT
EOF

echo "→ scripts de automação"
install -m 755 "$CURSOR_PKG/scripts/link-project.sh" "$CURSOR_DIR/"
install -m 755 "$CURSOR_PKG/scripts/link-project-rules.sh" "$CURSOR_DIR/"
install -m 755 "$CURSOR_PKG/scripts/hooks/ensure-project-cursor.sh" "$CURSOR_DIR/hooks/"
install -m 755 "$CURSOR_DIR/hooks/ensure-project-cursor.sh" "$CURSOR_DIR/hooks/ensure-project-rules.sh"

if [[ "$INSTALL_HOOKS" -eq 1 ]]; then
  HOOKS_FILE="$CURSOR_DIR/hooks.json"
  EXAMPLE="$CURSOR_PKG/scripts/hooks/hooks.json.example"

  if [[ -f "$HOOKS_FILE" ]]; then
    echo ""
    echo "⚠ hooks.json já existe — adicione sessionStart manualmente:"
    echo '  { "command": "./hooks/ensure-project-cursor.sh" }'
  else
    cp "$EXAMPLE" "$HOOKS_FILE"
    echo "→ hooks.json (sessionStart → ensure-project-cursor)"
  fi
fi

echo ""
echo "Skills instaladas."
echo "Próximo: npm run bootstrap -- /caminho/do/seu/repo"
