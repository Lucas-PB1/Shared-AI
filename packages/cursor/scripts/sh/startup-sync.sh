#!/usr/bin/env bash
# Executado no login/boot: git pull + sync se boot sync estiver ON.
set -euo pipefail

CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
STATE_FILE="$CURSOR_DIR/shared-ai/boot-sync.env"
ENV_FILE="$CURSOR_DIR/shared-ai.env"
LOG_FILE="$CURSOR_DIR/shared-ai/boot-sync.log"

log() {
  mkdir -p "$(dirname "$LOG_FILE")"
  printf '[%s] %s\n' "$(date -Iseconds 2>/dev/null || date)" "$1" >>"$LOG_FILE"
}

# Rotaciona o log se passar de ~1 MB (mantém 1 backup) — evita crescimento sem limite.
mkdir -p "$(dirname "$LOG_FILE")"
if [[ -f "$LOG_FILE" ]] && (($(wc -c <"$LOG_FILE" 2>/dev/null || echo 0) > 1048576)); then
  mv -f "$LOG_FILE" "$LOG_FILE.1"
fi

if [[ -f "$STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
fi

if [[ "${BOOT_SYNC:-off}" != "on" ]]; then
  exit 0
fi

if [[ ! -f "$ENV_FILE" ]]; then
  log "shared-ai.env ausente — abortando"
  exit 0
fi

# shellcheck disable=SC1090
source "$ENV_FILE"
ROOT="${SHARED_AI_ROOT:-}"

if [[ -z "$ROOT" || ! -d "$ROOT" ]]; then
  log "clone ausente: ${ROOT:-?}"
  exit 0
fi

log "início boot sync (root=$ROOT)"

if command -v git >/dev/null 2>&1 && git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  if git -C "$ROOT" pull --ff-only >>"$LOG_FILE" 2>&1; then
    log "git pull ok"
  else
    log "git pull falhou (sync local continua)"
  fi
else
  log "git indisponível ou diretório não é repo"
fi

if command -v node >/dev/null 2>&1; then
  if node "$ROOT/packages/cursor/scripts/mjs/run.mjs" sync >>"$LOG_FILE" 2>&1; then
    log "sync ok"
  else
    log "sync falhou (exit $?)"
  fi
else
  log "node não encontrado no PATH"
fi

log "fim boot sync"
exit 0
