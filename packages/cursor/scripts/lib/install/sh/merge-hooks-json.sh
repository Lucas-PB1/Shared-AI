#!/usr/bin/env bash
# Merge idempotente do sessionStart shared-ai em ~/.cursor/hooks.json
#
# Source: source .../merge-hooks-json.sh
#         merge_shared_ai_hooks_json "$cursor_pkg"

merge_shared_ai_hooks_json() {
  local cursor_pkg="$1"
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  local hooks_file="$cursor_dir/hooks.json"
  local example="$cursor_pkg/scripts/hooks/hooks.json.example"
  local merge_ts="$cursor_pkg/scripts/lib/install/ts/merge-hooks-json.ts"
  local result rc=0

  if [[ ! -f "$merge_ts" ]]; then
    echo "Erro: merge-hooks-json.ts não encontrado" >&2
    return 1
  fi

  mkdir -p "$cursor_dir/hooks"

  # shellcheck disable=SC1091
  source "$(dirname "${BASH_SOURCE[0]}")/shared-ai-env.sh"
  result="$(shared_ai_tsx "$merge_ts" "$hooks_file" "$example")" || rc=$?
  if [[ "$rc" -ne 0 ]]; then
    echo "✗ hooks.json — merge falhou" >&2
    return 1
  fi

  case "$result" in
    created)
      echo "→ hooks.json criado (sessionStart → ensure-project-cursor)"
      ;;
    merged)
      echo "→ hooks.json atualizado (sessionStart → ensure-project-cursor, hooks existentes preservados)"
      ;;
    ok)
      echo "→ hooks.json ok (sessionStart shared-ai já presente)"
      ;;
    *)
      echo "✗ hooks.json — resposta inesperada do merge: $result" >&2
      return 1
      ;;
  esac
}
