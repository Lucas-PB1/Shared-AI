#!/usr/bin/env bash
# Hook stop: follow-up se arquivos do escopo /historico foram alterados.
# Project hook — cwd = raiz do projeto.
set -euo pipefail

WATCHES=".cursor/history/watches.json"
[[ -f "$WATCHES" ]] || exit 0

MATCHER=""
HOSTDIME_ROOT="${HOSTDIME_IA_ROOT:-}"
if [[ -z "$HOSTDIME_ROOT" && -f "${HOME}/.cursor/hostdime-ia.env" ]]; then
  # shellcheck disable=SC1091
  source "${HOME}/.cursor/hostdime-ia.env"
  HOSTDIME_ROOT="${HOSTDIME_IA_ROOT:-}"
fi
if [[ -n "$HOSTDIME_ROOT" ]]; then
  MATCHER="$HOSTDIME_ROOT/packages/cursor/scripts/lib/history/history-watch-match.ts"
fi

if [[ ! -f "$MATCHER" ]]; then
  exit 0
fi

# shellcheck disable=SC1091
source "$HOSTDIME_ROOT/packages/cursor/scripts/lib/install/sh/hostdime-env.sh"

exec hostdime_tsx "$MATCHER" stop
