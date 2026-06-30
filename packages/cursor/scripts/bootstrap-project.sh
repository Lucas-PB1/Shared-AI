#!/usr/bin/env bash
# Prepara um repositório: rules, commands /avaliar + /finalizar, pastas review.
# Uso: npm run bootstrap -- /caminho/do/repo
set -euo pipefail

PROJECT="${1:?Informe o diretório raiz do projeto (npm run bootstrap -- /caminho)}"
LINK_SCRIPT="${CURSOR_LINK_PROJECT_SCRIPT:-${CURSOR_LINK_RULES_SCRIPT:-$HOME/.cursor/link-project.sh}}"

if [[ ! -x "$LINK_SCRIPT" ]]; then
  echo "Pacote não instalado. Execute primeiro:" >&2
  echo "  npm run setup:skills" >&2
  exit 1
fi

if [[ ! -d "$PROJECT" ]]; then
  echo "Diretório não encontrado: $PROJECT" >&2
  exit 1
fi

mkdir -p "$PROJECT/.cursor/skills"
"$LINK_SCRIPT" "$PROJECT"

echo ""
echo "Projeto preparado: $PROJECT"
echo "  .cursor/rules/    → symlinks (orquestrador)"
echo "  .cursor/commands/ → /avaliar, /finalizar"
echo "  .cursor/review/   → inbox/, reports/, resultados/"
echo "  .cursor/skills/   → overrides do projeto"
