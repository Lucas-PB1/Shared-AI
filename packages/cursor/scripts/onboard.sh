#!/usr/bin/env bash
# Wizard de primeira configuração: setup, perfil, bootstrap, extras.
# Uso: npm run onboard [-- --project=PATH] [--profile=NAME] [--no-code-review] [--yes]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
ENV_FILE="$CURSOR_DIR/hostdime-ia.env"

PROJECT=""
PROFILE=""
SKIP_CODE_REVIEW=0
NON_INTERACTIVE=0
SKIP_EXTRAS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project=*) PROJECT="${1#--project=}"; shift ;;
    --project)
      PROJECT="${2:?Informe o caminho do projeto}"
      shift 2
      ;;
    --profile=*) PROFILE="${1#--profile=}"; shift ;;
    --profile)
      PROFILE="${2:?Informe o perfil}"
      shift 2
      ;;
    --no-code-review) SKIP_CODE_REVIEW=1; shift ;;
    --yes | -y) NON_INTERACTIVE=1; shift ;;
    --skip-extras) SKIP_EXTRAS=1; shift ;;
    run) shift ;;
    -h | --help)
      cat <<'EOF'
Uso: npm run onboard [-- opções]

Wizard interativo (ou flags para CI/script):

  --project=PATH       Caminho do repositório
  --profile=NAME       Perfil (laravel, next, python, …)
  --no-code-review     Pula setup:code-review
  --yes, -y            Aceita defaults (sem prompts)
  --skip-extras        Não oferece boot-sync / sync-inbox / cursor-cli

Perfis: listados em packages/cursor/profiles/
Detecção automática quando --profile omitido e --project informado.
EOF
      exit 0
      ;;
    *)
      echo "Argumento desconhecido: $1" >&2
      exit 1
      ;;
  esac
done

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/profiles.sh"
export HOSTDIME_IA_ROOT="$MONOREPO_ROOT"

onboard_prompt() {
  local prompt="$1"
  local default="${2:-}"
  local reply

  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    echo "$default"
    return
  fi

  if [[ -n "$default" ]]; then
    read -r -p "$prompt [$default]: " reply
    echo "${reply:-$default}"
  else
    read -r -p "$prompt: " reply
    echo "$reply"
  fi
}

onboard_confirm() {
  local prompt="$1"
  local default="${2:-n}"
  local reply

  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    [[ "$default" == "y" || "$default" == "Y" ]]
    return
  fi

  read -r -p "$prompt [y/N]: " reply
  [[ "${reply:-n}" =~ ^[Yy] ]]
}

onboard_select_profile() {
  local detected="${1:-}"
  local profiles=()
  local choice="" i=1 p

  mapfile -t profiles < <(profiles_list)

  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    if [[ -n "$PROFILE" ]]; then
      echo "$PROFILE"
      return
    fi
    echo "${detected:-}"
    return
  fi

  echo ""
  echo "Escolha o perfil do projeto:"
  if [[ -n "$detected" ]]; then
    echo "  [Enter] $detected (detectado automaticamente)"
  fi
  for p in "${profiles[@]}"; do
    echo "  $i) $p"
    i=$((i + 1))
  done
  echo "  s) Sem perfil (bootstrap genérico)"
  echo ""

  read -r -p "Opção: " choice

  if [[ -z "$choice" && -n "$detected" ]]; then
    echo "$detected"
    return
  fi

  if [[ "$choice" == "s" || "$choice" == "S" ]]; then
    echo ""
    return
  fi

  if [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#profiles[@]} )); then
    echo "${profiles[$((choice - 1))]}"
    return
  fi

  if profiles_is_valid "$choice"; then
    echo "$choice"
    return
  fi

  echo "Opção inválida; usando sem perfil." >&2
  echo ""
}

echo "HostDime IA — onboarding"
echo ""

section() {
  echo ""
  echo "=== $1 ==="
}

section "1. Pacote skills"
if [[ -f "$ENV_FILE" ]]; then
  echo "  ✓ já instalado ($ENV_FILE)"
else
  echo "  → npm run setup:skills"
  (cd "$MONOREPO_ROOT" && npm run setup:skills)
fi

section "2. Code review"
if [[ "$SKIP_CODE_REVIEW" -eq 1 ]]; then
  echo "  · pulado (--no-code-review)"
elif [[ -x "$CURSOR_DIR/review-check.sh" ]]; then
  echo "  ✓ ferramentas de review já instaladas"
elif onboard_confirm "Instalar code review (/avaliar, PHPStan, ESLint)?" "y"; then
  echo "  → npm run setup:code-review"
  (cd "$MONOREPO_ROOT" && npm run setup:code-review)
else
  echo "  · pulado (rode depois: npm run setup:code-review)"
fi

section "3. Projeto"
if [[ -z "$PROJECT" ]]; then
  PROJECT="$(onboard_prompt "Caminho do repositório" "$PWD")"
fi

if [[ ! -d "$PROJECT" ]]; then
  echo "Erro: diretório não encontrado: $PROJECT" >&2
  exit 1
fi
PROJECT="$(cd "$PROJECT" && pwd)"
echo "  → $PROJECT"

section "4. Perfil"
detected=""
if [[ -z "$PROFILE" ]]; then
  detected="$(detect_project_profile "$PROJECT")"
  if [[ -n "$detected" ]]; then
    echo "  Detectado: $detected"
  else
    echo "  Nenhum perfil detectado automaticamente."
  fi
  PROFILE="$(onboard_select_profile "$detected")"
elif ! profiles_is_valid "$PROFILE"; then
  echo "Erro: perfil desconhecido: $PROFILE" >&2
  profiles_usage_line >&2
  exit 1
else
  echo "  → $PROFILE (--profile)"
fi

section "5. Bootstrap"
bootstrap_args=("$PROJECT")
if [[ -n "$PROFILE" ]]; then
  bootstrap_args=(--profile="$PROFILE" "$PROJECT")
  echo "  → npm run bootstrap -- --profile=$PROFILE $PROJECT"
else
  echo "  → npm run bootstrap -- $PROJECT"
fi

(cd "$MONOREPO_ROOT" && npm run bootstrap -- "${bootstrap_args[@]}")

if [[ "$SKIP_EXTRAS" -eq 0 && "$NON_INTERACTIVE" -eq 0 ]]; then
  section "6. Extras (opcional)"
  if onboard_confirm "Ativar boot-sync (git pull + sync ao logar)?"; then
    (cd "$MONOREPO_ROOT" && npm run boot-sync -- on)
  fi
  if onboard_confirm "Ativar sync-inbox (projetos dirty ao logar)?"; then
    (cd "$MONOREPO_ROOT" && npm run sync-inbox -- on)
  fi
  if command -v agent >/dev/null 2>&1; then
    echo "  ✓ Cursor CLI (agent) já no PATH"
  elif onboard_confirm "Instalar Cursor CLI (agent)?"; then
    (cd "$MONOREPO_ROOT" && npm run cursor-cli -- install --skip-login || true)
  fi
  if [[ "$PROFILE" == "hubspot" ]] && onboard_confirm "Instalar MCP HubSpotDev?"; then
    if [[ -x "$CURSOR_DIR/install-hubspot-mcp.sh" ]]; then
      "$CURSOR_DIR/install-hubspot-mcp.sh" || true
    fi
  fi
fi

echo ""
echo "=== Concluído ==="
echo "  Projeto: $PROJECT"
[[ -n "$PROFILE" ]] && echo "  Perfil:  $PROFILE"
echo ""
echo "Próximos passos:"
echo "  1. Abra o projeto no Cursor"
echo "  2. Use /skills-why para debug de roteamento"
echo "  3. npm run health — saúde dos projetos registrados"
echo ""
