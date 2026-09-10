#!/usr/bin/env bash
# Executado no login: scan projetos sync + menu sync-inbox (se ON).
set -euo pipefail

CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
STATE_FILE="$CURSOR_DIR/shared-ai/sync-inbox.env"
ENV_FILE="$CURSOR_DIR/shared-ai.env"
LIB="$CURSOR_DIR/shared-ai-sync-inbox.sh"

SYNC_INBOX_LOG="$CURSOR_DIR/shared-ai/sync-inbox.log"

log() {
  mkdir -p "$CURSOR_DIR/shared-ai"
  printf '[%s] %s\n' "$(date -Iseconds 2>/dev/null || date)" "$1" >>"$SYNC_INBOX_LOG"
}

# Rotaciona o log se passar de ~1 MB (mantém 1 backup) — evita crescimento sem limite.
mkdir -p "$CURSOR_DIR/shared-ai"
if [[ -f "$SYNC_INBOX_LOG" ]] && (($(wc -c <"$SYNC_INBOX_LOG" 2>/dev/null || echo 0) > 1048576)); then
  mv -f "$SYNC_INBOX_LOG" "$SYNC_INBOX_LOG.1"
fi

if [[ -f "$STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
fi

if [[ "${SYNC_INBOX:-off}" != "on" ]]; then
  exit 0
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

if [[ ! -f "$LIB" ]]; then
  log "shared-ai-sync-inbox.sh ausente"
  exit 0
fi

# shellcheck disable=SC1091
source "$LIB"

log "início sync-inbox"
sync_inbox_run || log "sync-inbox falhou"
log "fim sync-inbox"
