#!/usr/bin/env bash
# Hook stop: follow-up se arquivos do escopo /historico foram alterados.
# Project hook — cwd = raiz do projeto.
set -euo pipefail

WATCHES=".cursor/history/watches.json"
[[ -f "$WATCHES" ]] || exit 0

MATCHER=""
SHARED_AI_ROOT="${SHARED_AI_ROOT:-}"
if [[ -z "$SHARED_AI_ROOT" && -f "${HOME}/.cursor/shared-ai.env" ]]; then
  # shellcheck disable=SC1091
  source "${HOME}/.cursor/shared-ai.env"
  SHARED_AI_ROOT="${SHARED_AI_ROOT:-}"
fi
if [[ -n "$SHARED_AI_ROOT" ]]; then
  MATCHER="$SHARED_AI_ROOT/packages/cursor/scripts/lib/history/history-watch-match.ts"
fi

if [[ ! -f "$MATCHER" ]]; then
  exit 0
fi

# shellcheck disable=SC1091
source "$SHARED_AI_ROOT/packages/cursor/scripts/lib/install/sh/shared-ai-env.sh"

exec shared_ai_tsx "$MATCHER" stop
