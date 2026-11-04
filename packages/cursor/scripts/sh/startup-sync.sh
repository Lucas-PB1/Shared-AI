#!/usr/bin/env bash
# Executado no login/boot.
#   BOOT_SYNC=on    → git pull --ff-only + npm run sync (executa o código novo do clone)
#   BOOT_SYNC=check → só git fetch + registra no log os commits pendentes (não executa nada novo)
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

MODE="${BOOT_SYNC:-off}"
if [[ "$MODE" != "on" && "$MODE" != "check" ]]; then
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

log "início boot sync (mode=$MODE, root=$ROOT)"

if ! command -v git >/dev/null 2>&1 || ! git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  log "git indisponível ou diretório não é repo"
  [[ "$MODE" == "check" ]] && exit 0
elif [[ "$MODE" == "check" ]]; then
  if ! git -C "$ROOT" fetch --quiet >>"$LOG_FILE" 2>&1; then
    log "git fetch falhou"
    exit 0
  fi
  pending="$(git -C "$ROOT" log --oneline 'HEAD..@{upstream}' 2>/dev/null || true)"
  if [[ -n "$pending" ]]; then
    log "commits pendentes (revise e rode git pull && npm run sync):"
    printf '%s\n' "$pending" | sed 's/^/    /' >>"$LOG_FILE"
  else
    log "clone em dia com o upstream"
  fi
  log "fim boot sync (check — nada executado)"
  exit 0
else
  before="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || true)"
  if git -C "$ROOT" pull --ff-only >>"$LOG_FILE" 2>&1; then
    after="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || true)"
    if [[ -n "$before" && "$before" != "$after" ]]; then
      log "git pull ok — aplicado ${before:0:12}..${after:0:12}:"
      git -C "$ROOT" log --oneline "$before..$after" 2>/dev/null | sed 's/^/    /' >>"$LOG_FILE" || true
    else
      log "git pull ok (sem mudanças)"
    fi
  else
    log "git pull falhou (sync local continua)"
  fi
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
