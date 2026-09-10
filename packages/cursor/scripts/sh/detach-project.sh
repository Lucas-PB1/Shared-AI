#!/usr/bin/env bash
# Remove symlinks shared-ai do projeto e opcionalmente desregistra do sync.
# Uso: npm run detach -- /caminho/do/repo [--keep-registry]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
ENV_FILE="$CURSOR_DIR/shared-ai.env"

PROJECT=""
KEEP_REGISTRY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-registry)
      KEEP_REGISTRY=1
      shift
      ;;
    -h | --help)
      echo "Uso: npm run detach -- <repo> [--keep-registry]"
      echo ""
      echo "Remove symlinks gerenciados (orquestrador + commands)."
      echo "Preserva arquivos reais, SKILLS-ROUTING.md e skills/ do projeto."
      echo "Por padrão remove o projeto do registry (npm run sync não relinka)."
      exit 0
      ;;
    *)
      if [[ -z "$PROJECT" ]]; then
        PROJECT="$1"
      else
        echo "Argumento inesperado: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

[[ -n "$PROJECT" ]] || {
  echo "Informe o diretório raiz do projeto:" >&2
  echo "  npm run detach -- /caminho/do/repo" >&2
  exit 1
}

# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/projects-registry.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/detach-project.sh"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi
SHARED_AI_ROOT="${SHARED_AI_ROOT:-$MONOREPO_ROOT}"

if [[ ! -d "$PROJECT" ]]; then
  echo "Diretório não encontrado: $PROJECT" >&2
  exit 1
fi

PROJECT="$(cd "$PROJECT" && pwd)"

detach_shared_ai_from_project "$PROJECT"

if [[ "$KEEP_REGISTRY" -eq 0 ]]; then
  if unregister_project "$PROJECT"; then
    echo "→ desregistrado do sync (registry)"
  fi
else
  echo "→ registry preservado (--keep-registry)"
fi

echo ""
echo "Detach concluído: $PROJECT"
