#!/usr/bin/env bash
# Prepara um repositório de código para usar o pacote HostDime IA.
# Uso: npm run cursor:bootstrap -- /caminho/do/repo
set -euo pipefail

PROJECT="${1:?Informe o diretório raiz do projeto (npm run cursor:bootstrap -- /caminho)}"
LINK_SCRIPT="${CURSOR_LINK_RULES_SCRIPT:-$HOME/.cursor/link-project-rules.sh}"

if [[ ! -x "$LINK_SCRIPT" ]]; then
  echo "Pacote não instalado. Execute primeiro:" >&2
  echo "  npm run setup" >&2
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
echo "  .cursor/rules/  → symlinks das rules orquestradoras"
echo "  .cursor/skills/ → vazio (adicione skills específicas do projeto aqui)"
