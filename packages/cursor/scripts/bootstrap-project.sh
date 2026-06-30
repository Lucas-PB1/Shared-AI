#!/usr/bin/env bash
# Prepara um repositório: rules, commands, pastas review, perfil opcional.
# Uso: npm run bootstrap -- /caminho/do/repo [--profile=laravel|hubspot|react]
#      npm run bootstrap -- --profile=react /caminho/do/repo
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LINK_SCRIPT="${CURSOR_LINK_PROJECT_SCRIPT:-${CURSOR_LINK_RULES_SCRIPT:-$HOME/.cursor/link-project.sh}}"

PROJECT=""
PROFILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile=*)
      PROFILE="${1#--profile=}"
      shift
      ;;
    --profile)
      PROFILE="${2:?Informe o perfil: laravel, hubspot ou react}"
      shift 2
      ;;
    -h | --help)
      echo "Uso: npm run bootstrap -- <repo> [--profile=laravel|hubspot|react]"
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
  echo "  npm run bootstrap -- /caminho/do/repo [--profile=laravel]" >&2
  exit 1
}

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/projects-registry.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/apply-bootstrap-profile.sh"

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
HOSTDIME_IA_ROOT="${HOSTDIME_IA_ROOT:-$MONOREPO_ROOT}"

if [[ -n "$PROFILE" ]]; then
  profile_dir="$HOSTDIME_IA_ROOT/packages/cursor/profiles/$PROFILE"
  if [[ ! -d "$profile_dir" ]]; then
    echo "Erro: perfil desconhecido: $PROFILE" >&2
    echo "Perfis disponíveis: laravel, hubspot, react" >&2
    exit 1
  fi
fi

mkdir -p "$PROJECT/.cursor/skills"
"$LINK_SCRIPT" "$PROJECT"
register_project "$PROJECT"

if [[ -n "$PROFILE" ]]; then
  apply_bootstrap_profile "$PROJECT" "$PROFILE"
fi

echo ""
echo "Projeto preparado: $PROJECT"
echo "  .cursor/rules/    → symlinks (orquestrador) + rules do projeto"
echo "  .cursor/commands/ → /avaliar, /avaliar-diff, /finalizar, /skills-why"
echo "  .cursor/review/   → reports/, resultados/, memoria.md"
echo "  .cursor/skills/   → overrides do projeto"
[[ -n "$PROFILE" ]] && echo "  perfil            → $PROFILE"
echo "  .gitignore        → artefatos gerenciados (se .cursor/ não estiver ignorado)"
