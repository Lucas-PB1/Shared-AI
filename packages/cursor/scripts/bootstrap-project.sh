#!/usr/bin/env bash
# Prepara um repositório: rules, commands, pastas review.
# Uso: npm run bootstrap -- /caminho/do/repo
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PROJECT="${1:?Informe o diretório raiz do projeto (npm run bootstrap -- /caminho)}"
LINK_SCRIPT="${CURSOR_LINK_PROJECT_SCRIPT:-${CURSOR_LINK_RULES_SCRIPT:-$HOME/.cursor/link-project.sh}}"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/projects-registry.sh"

if [[ ! -x "$LINK_SCRIPT" ]]; then
  echo "Pacote não instalado. Execute primeiro:" >&2
  echo "  npm run setup:skills" >&2
  exit 1
fi

if [[ ! -d "$PROJECT" ]]; then
  echo "Diretório não encontrado: $PROJECT" >&2
  exit 1
fi

PROJECT="$(cd "$PROJECT" && pwd)"
mkdir -p "$PROJECT/.cursor/skills"
"$LINK_SCRIPT" "$PROJECT"
register_project "$PROJECT"

echo ""
echo "Projeto preparado: $PROJECT"
echo "  .cursor/rules/    → symlinks (orquestrador)"
echo "  .cursor/commands/ → /avaliar, /avaliar-diff, /finalizar"
echo "  .cursor/review/   → inbox/, reports/, resultados/, memoria.md"
echo "  .cursor/skills/   → overrides do projeto"
echo "  .gitignore        → artefatos gerenciados (se .cursor/ não estiver ignorado)"
