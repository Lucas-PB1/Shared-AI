#!/usr/bin/env bash
# Instala rules, skills e scripts em ~/.cursor/ a partir deste repositório.
# Uso: npm run cursor:install [--hooks via cursor:install:hooks]
set -euo pipefail

INSTALL_HOOKS=0
if [[ "${1:-}" == "--hooks" ]]; then
  INSTALL_HOOKS=1
fi

PACKAGE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"

echo "HostDime IA (cursor) — instalando em $CURSOR_DIR"
echo "Fonte: $PACKAGE_ROOT"
echo ""

mkdir -p "$CURSOR_DIR"/{rules,skills,hooks}

echo "→ rules (orquestrador)"
rsync -a "$PACKAGE_ROOT/rules/" "$CURSOR_DIR/rules/"

echo "→ skills"
rsync -a "$PACKAGE_ROOT/skills/" "$CURSOR_DIR/skills/"

echo "→ SKILLS-ROUTING.md"
cp "$PACKAGE_ROOT/docs/SKILLS-ROUTING.md" "$CURSOR_DIR/"

echo "→ scripts de automação"
install -m 755 "$PACKAGE_ROOT/scripts/link-project-rules.sh" "$CURSOR_DIR/"
install -m 755 "$PACKAGE_ROOT/scripts/hooks/ensure-project-rules.sh" "$CURSOR_DIR/hooks/"

if [[ "$INSTALL_HOOKS" -eq 1 ]]; then
  HOOKS_FILE="$CURSOR_DIR/hooks.json"
  EXAMPLE="$PACKAGE_ROOT/scripts/hooks/hooks.json.example"

  if [[ -f "$HOOKS_FILE" ]]; then
    echo ""
    echo "⚠ hooks.json já existe em $HOOKS_FILE"
    echo "  Adicione manualmente o hook sessionStart:"
    echo '  { "command": "./hooks/ensure-project-rules.sh" }'
  else
    cp "$EXAMPLE" "$HOOKS_FILE"
    echo "→ hooks.json criado (sessionStart → ensure-project-rules)"
  fi
fi

echo ""
echo "Instalação concluída."
echo ""
echo "Próximo passo — preparar um projeto de código:"
echo "  $CURSOR_DIR/link-project-rules.sh /caminho/do/seu/repo"
echo ""
echo "Ou use:"
echo "  npm run cursor:bootstrap -- /caminho/do/seu/repo"
