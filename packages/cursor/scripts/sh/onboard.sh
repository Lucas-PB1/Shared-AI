#!/usr/bin/env bash
# Wizard de configuração: atualiza monorepo, skills, perfil, bootstrap, extras.
# Uso: npm run onboard [-- --project=PATH] [--profile=NAME] [--yes]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
ENV_FILE="$CURSOR_DIR/shared-ai.env"
SETUP_ENV="$MONOREPO_ROOT/scripts/setup-project.mjs"

PROJECT=""
PROFILE=""
NON_INTERACTIVE=0
SKIP_EXTRAS=0
SKIP_PULL=0

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
    --yes | -y) NON_INTERACTIVE=1; shift ;;
    --skip-extras) SKIP_EXTRAS=1; shift ;;
    --skip-pull) SKIP_PULL=1; shift ;;
    run) shift ;;
    -h | --help)
      cat <<'EOF'
Uso: npm run onboard [-- opções]

Atualiza o clone shared-ai (git pull + sync + .env vazio) e configura o projeto.

  --project=PATH       Caminho do repositório (default: monorepo ou PWD)
  --profile=NAME       Perfil (monorepo, nestjs, next, react, …)
  --yes, -y            Aceita defaults (sem prompts)
  --skip-extras        Não oferece boot-sync / sync-inbox / cursor-cli
  --skip-pull          Não faz git pull no monorepo

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
source "$SCRIPT_DIR/../lib/profiles/sh/profiles.sh"
export SHARED_AI_ROOT="$MONOREPO_ROOT"

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

echo "Shared AI — onboarding"
echo ""

section() {
  echo ""
  echo "=== $1 ==="
}

section "1. Atualizar monorepo"
echo "  Clone: $MONOREPO_ROOT"

if [[ "$SKIP_PULL" -eq 1 ]]; then
  echo "  · git pull pulado (--skip-pull)"
else
  if [[ -d "$MONOREPO_ROOT/.git" ]]; then
    echo "  → git pull --ff-only"
    if ! (cd "$MONOREPO_ROOT" && git pull --ff-only); then
      echo "  ! git pull falhou (working tree dirty ou divergência) — continuando com o clone local" >&2
    fi
  else
    echo "  · sem .git — pull ignorado"
  fi
fi

echo "  → npm run setup -- --env-only   (.env vazio se faltar; não preenche secrets)"
if [[ -f "$SETUP_ENV" ]]; then
  (cd "$MONOREPO_ROOT" && node "$SETUP_ENV" --env-only)
else
  echo "  ! scripts/setup-project.mjs ausente" >&2
fi

section "2. Pacote skills + sync"
if [[ -f "$ENV_FILE" ]]; then
  echo "  ✓ skills já instaladas ($ENV_FILE)"
  echo "  → npm run sync"
  (cd "$MONOREPO_ROOT" && npm run sync)
else
  echo "  → npm run setup:skills"
  (cd "$MONOREPO_ROOT" && npm run setup:skills)
  echo "  → npm run sync"
  (cd "$MONOREPO_ROOT" && npm run sync) || true
fi

section "3. Projeto"
default_project="$MONOREPO_ROOT"
if [[ -z "$PROJECT" ]]; then
  if [[ "$NON_INTERACTIVE" -eq 1 ]]; then
    PROJECT="$default_project"
  else
    PROJECT="$(onboard_prompt "Caminho do repositório" "$default_project")"
  fi
fi

if [[ ! -d "$PROJECT" ]]; then
  echo "Erro: diretório não encontrado: $PROJECT" >&2
  exit 1
fi
PROJECT="$(cd "$PROJECT" && pwd)"
echo "  → $PROJECT"

section "5. Perfil"
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

if [[ "$PROJECT" == "$MONOREPO_ROOT" && -z "$PROFILE" ]]; then
  PROFILE="next"
  echo "  → next (default do monorepo / dashboard)"
fi

section "6. Bootstrap"
bootstrap_args=("$PROJECT")
if [[ -n "$PROFILE" ]]; then
  bootstrap_args=(--profile="$PROFILE" "$PROJECT")
  echo "  → npm run bootstrap -- --profile=$PROFILE $PROJECT"
else
  echo "  → npm run bootstrap -- $PROJECT"
fi

(cd "$MONOREPO_ROOT" && npm run bootstrap -- "${bootstrap_args[@]}")

# Dashboard Next.js (monorepo shared-ai ou perfil next)
is_monorepo_project=0
[[ "$PROJECT" == "$MONOREPO_ROOT" ]] && is_monorepo_project=1
configure_next=0
if [[ "$is_monorepo_project" -eq 1 || "$PROFILE" == "next" ]]; then
  configure_next=1
fi

if [[ "$configure_next" -eq 1 ]]; then
  section "7. Dashboard Next.js"
  echo "  → npm install"
  (cd "$MONOREPO_ROOT" && npm install)

  supabase_up=0
  if (cd "$MONOREPO_ROOT" && npx supabase status >/dev/null 2>&1); then
    supabase_up=1
  fi

  if [[ "$supabase_up" -eq 1 ]]; then
    echo "  · Supabase local up — preencha NEXT_PUBLIC_SUPABASE_* no .env com npm run supabase:status"
  else
    echo "  · Supabase local parado — depois: npm run supabase:start e copie as keys para o .env"
  fi

  echo "  · App: npm run dev  →  http://localhost:3000"
fi

if [[ "$SKIP_EXTRAS" -eq 0 && "$NON_INTERACTIVE" -eq 0 ]]; then
  section "8. Extras (opcional)"
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
fi

env_ready=0
if [[ -f "$MONOREPO_ROOT/.env" ]]; then
  if grep -Eq '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_URL)=https?://.+' "$MONOREPO_ROOT/.env" \
    && grep -Eq '^(SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY)=.+' "$MONOREPO_ROOT/.env"; then
    env_ready=1
  fi
fi

echo ""
echo "=== Concluído ==="
echo "  Monorepo: $MONOREPO_ROOT"
echo "  Projeto:  $PROJECT"
[[ -n "$PROFILE" ]] && echo "  Perfil:   $PROFILE"
echo ""
echo "Pronto no Cursor (skills/sync/bootstrap$([ "$configure_next" -eq 1 ] && echo '+Next' || true))."
echo ""
if [[ "$configure_next" -eq 1 ]]; then
  if [[ "$env_ready" -eq 0 ]]; then
    echo "Dashboard Next — ainda falta secrets no .env:"
    echo "  1. npm run supabase:start"
    echo "  2. copie URL e keys do npm run supabase:status para o .env"
    echo "  3. npm run dev"
  else
    echo "Dashboard Next — .env ok. Para subir:"
    echo "  npm run dev"
  fi
elif [[ "$env_ready" -eq 0 ]]; then
  echo "Ainda falta — .env sem secrets:"
  echo "  1. npm run supabase:start"
  echo "  2. preencha $MONOREPO_ROOT/.env com as keys locais"
else
  echo "Próximos passos: npm run health · abra o projeto no Cursor"
fi
echo "  · npm run health — saúde dos projetos registrados"
echo ""
