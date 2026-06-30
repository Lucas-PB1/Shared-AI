#!/usr/bin/env bash
# Instala pacote HostDime IA em ~/.cursor/
# Uso: npm run setup (via cursor:install:hooks)
set -euo pipefail

INSTALL_HOOKS=0
if [[ "${1:-}" == "--hooks" ]]; then
  INSTALL_HOOKS=1
fi

CURSOR_PKG="$(cd "$(dirname "$0")/.." && pwd)"
REVIEW_PKG="$(cd "$CURSOR_PKG/../code-review" && pwd)"
MONOREPO_ROOT="$(cd "$CURSOR_PKG/../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"

echo "HostDime IA — instalando em $CURSOR_DIR"
echo "Monorepo: $MONOREPO_ROOT"
echo ""

mkdir -p "$CURSOR_DIR"/{rules,skills,commands,hooks}

echo "→ rules (orquestrador)"
rsync -a "$CURSOR_PKG/rules/" "$CURSOR_DIR/rules/"

echo "→ skills (cursor)"
rsync -a "$CURSOR_PKG/skills/" "$CURSOR_DIR/skills/"

echo "→ skills (code-review)"
rsync -a "$REVIEW_PKG/skills/" "$CURSOR_DIR/skills/"

echo "→ commands (/avaliar, /finalizar)"
rsync -a "$REVIEW_PKG/commands/" "$CURSOR_DIR/commands/"

echo "→ SKILLS-ROUTING.md"
cp "$CURSOR_PKG/docs/SKILLS-ROUTING.md" "$CURSOR_DIR/"

echo "→ hostdime-ia.env"
cat >"$CURSOR_DIR/hostdime-ia.env" <<EOF
HOSTDIME_IA_ROOT=$MONOREPO_ROOT
EOF

echo "→ scripts de automação"
install -m 755 "$CURSOR_PKG/scripts/link-project.sh" "$CURSOR_DIR/"
install -m 755 "$CURSOR_PKG/scripts/link-project-rules.sh" "$CURSOR_DIR/" 2>/dev/null || ln -sf "$CURSOR_DIR/link-project.sh" "$CURSOR_DIR/link-project-rules.sh"
install -m 755 "$CURSOR_PKG/scripts/hooks/ensure-project-cursor.sh" "$CURSOR_DIR/hooks/"
# compat: nome antigo do hook
install -m 755 "$CURSOR_DIR/hooks/ensure-project-cursor.sh" "$CURSOR_DIR/hooks/ensure-project-rules.sh"

install -m 755 "$REVIEW_PKG/tools/check-inbox.sh" "$CURSOR_DIR/review-check.sh"
install -m 755 "$REVIEW_PKG/tools/finalizar-review.sh" "$CURSOR_DIR/review-finalizar.sh"

if [[ "$INSTALL_HOOKS" -eq 1 ]]; then
  HOOKS_FILE="$CURSOR_DIR/hooks.json"
  EXAMPLE="$CURSOR_PKG/scripts/hooks/hooks.json.example"

  if [[ -f "$HOOKS_FILE" ]]; then
    echo ""
    echo "⚠ hooks.json já existe em $HOOKS_FILE"
    echo "  Adicione manualmente o hook sessionStart:"
    echo '  { "command": "./hooks/ensure-project-cursor.sh" }'
  else
    cp "$EXAMPLE" "$HOOKS_FILE"
    echo "→ hooks.json criado (sessionStart → ensure-project-cursor)"
  fi
fi

echo ""
echo "Instalação concluída."
echo ""
echo "Próximo passo — preparar um projeto:"
echo "  npm run cursor:bootstrap -- /caminho/do/seu/repo"
