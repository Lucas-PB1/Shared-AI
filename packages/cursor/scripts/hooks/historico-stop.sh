#!/usr/bin/env bash
# Hook stop: follow-up se arquivos do escopo /historico foram alterados.
# Project hook — cwd = raiz do projeto.
set -euo pipefail

WATCHES=".cursor/history/watches.json"
[[ -f "$WATCHES" ]] || exit 0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MATCHER="$SCRIPT_DIR/history-watch-match.py"

if [[ ! -f "$MATCHER" ]]; then
  HOSTDIME_ROOT="${HOSTDIME_IA_ROOT:-}"
  if [[ -z "$HOSTDIME_ROOT" && -f "${HOME}/.cursor/hostdime-ia.env" ]]; then
    # shellcheck disable=SC1091
    source "${HOME}/.cursor/hostdime-ia.env"
    HOSTDIME_ROOT="${HOSTDIME_IA_ROOT:-}"
  fi
  if [[ -n "$HOSTDIME_ROOT" ]]; then
    MATCHER="$HOSTDIME_ROOT/packages/cursor/scripts/lib/history-watch-match.py"
  fi
fi

if [[ ! -f "$MATCHER" ]]; then
  exit 0
fi

exec python3 "$MATCHER" stop
