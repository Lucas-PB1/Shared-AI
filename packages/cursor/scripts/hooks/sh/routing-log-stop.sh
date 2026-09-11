#!/usr/bin/env bash
# Hook stop (usuário): follow-up de routing-log se o turno editou código.
set -euo pipefail

resolve_root() {
  if [[ -n "${SHARED_AI_ROOT:-}" && -d "$SHARED_AI_ROOT" ]]; then
    printf '%s' "$SHARED_AI_ROOT"
    return
  fi
  local env_file="${HOME}/.cursor/shared-ai.env"
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    SHARED_AI_ROOT="$(grep -E '^SHARED_AI_ROOT=' "$env_file" | head -1 | cut -d= -f2- | tr -d '"' || true)"
    if [[ -n "${SHARED_AI_ROOT:-}" && -d "$SHARED_AI_ROOT" ]]; then
      printf '%s' "$SHARED_AI_ROOT"
      return
    fi
  fi
  printf ''
}

ROOT="$(resolve_root)"
SCRIPT="${ROOT}/packages/cursor/scripts/lib/routing/routing-log-stop.ts"

if [[ -z "$ROOT" || ! -f "$SCRIPT" ]]; then
  printf '%s\n' '{"followup_message":""}'
  exit 0
fi

TSX="${ROOT}/node_modules/.bin/tsx"
if [[ ! -x "$TSX" ]]; then
  TSX="$(command -v tsx || true)"
fi
if [[ -z "$TSX" ]]; then
  printf '%s\n' '{"followup_message":""}'
  exit 0
fi

if [[ -t 0 ]]; then
  "$TSX" "$SCRIPT"
else
  "$TSX" "$SCRIPT"
fi
