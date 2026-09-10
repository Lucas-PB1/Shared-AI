#!/usr/bin/env bash
# Leitura/escrita de ~/.cursor/shared-ai.env e VERSION

shared_ai_shell_quote() {
  printf '%q' "$1"
}

shared_ai_resolve_root() {
  if [[ -n "${SHARED_AI_ROOT:-}" && -d "$SHARED_AI_ROOT" ]]; then
    printf '%s' "$SHARED_AI_ROOT"
    return
  fi
  local env_file="${CURSOR_USER_DIR:-$HOME/.cursor}/shared-ai.env"
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    source "$env_file"
    if [[ -n "${SHARED_AI_ROOT:-}" && -d "$SHARED_AI_ROOT" ]]; then
      printf '%s' "$SHARED_AI_ROOT"
      return
    fi
  fi
  return 1
}

shared_ai_read_version() {
  local root="$1"
  if [[ -f "$root/VERSION" ]]; then
    tr -d '[:space:]' <"$root/VERSION"
    return
  fi
  if command -v git >/dev/null 2>&1 && git -C "$root" rev-parse --short HEAD >/dev/null 2>&1; then
    git -C "$root" rev-parse --short HEAD
    return
  fi
  printf '?'
}

shared_ai_write_env() {
  local root="$1"
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  local version now
  version="$(shared_ai_read_version "$root")"
  now="$(date -Iseconds)"
  mkdir -p "$cursor_dir"
  cat >"$cursor_dir/shared-ai.env" <<EOF
SHARED_AI_ROOT=$(shared_ai_shell_quote "$root")
SHARED_AI_VERSION=$(shared_ai_shell_quote "$version")
SHARED_AI_INSTALLED_AT=$(shared_ai_shell_quote "$now")
SHARED_AI_LAST_SYNC=$(shared_ai_shell_quote "$now")
EOF
}

shared_ai_update_sync_time() {
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  local env_file="$cursor_dir/shared-ai.env"
  local root version now installed_at
  [[ -f "$env_file" ]] || return 0
  # shellcheck disable=SC1090
  source "$env_file"
  root="${SHARED_AI_ROOT:-}"
  version="$(shared_ai_read_version "$root")"
  now="$(date -Iseconds)"
  installed_at="${SHARED_AI_INSTALLED_AT:-$now}"
  cat >"$env_file" <<EOF
SHARED_AI_ROOT=$(shared_ai_shell_quote "$root")
SHARED_AI_VERSION=$(shared_ai_shell_quote "$version")
SHARED_AI_INSTALLED_AT=$(shared_ai_shell_quote "$installed_at")
SHARED_AI_LAST_SYNC=$(shared_ai_shell_quote "$now")
EOF
}

shared_ai_installed_version() {
  local env_file="${CURSOR_USER_DIR:-$HOME/.cursor}/shared-ai.env"
  [[ -f "$env_file" ]] || return 1
  # shellcheck disable=SC1090
  source "$env_file"
  printf '%s' "${SHARED_AI_VERSION:-?}"
}

shared_ai_tsx_bin() {
  local root tsx
  root="$(shared_ai_resolve_root)" || return 1
  tsx="$root/node_modules/.bin/tsx"
  if [[ -x "$tsx" || -f "$tsx" ]]; then
    printf '%s' "$tsx"
    return 0
  fi
  if command -v tsx >/dev/null 2>&1; then
    command -v tsx
    return 0
  fi
  return 1
}

shared_ai_tsx() {
  local bin
  bin="$(shared_ai_tsx_bin)" || {
    echo "Erro: tsx não encontrado (npm install na raiz do monorepo)" >&2
    return 1
  }
  "$bin" "$@"
}
