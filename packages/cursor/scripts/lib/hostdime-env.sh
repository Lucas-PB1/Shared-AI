#!/usr/bin/env bash
# Leitura/escrita de ~/.cursor/hostdime-ia.env e VERSION

hostdime_resolve_root() {
  if [[ -n "${HOSTDIME_IA_ROOT:-}" && -d "$HOSTDIME_IA_ROOT" ]]; then
    printf '%s' "$HOSTDIME_IA_ROOT"
    return
  fi
  local env_file="${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env"
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    source "$env_file"
    if [[ -n "${HOSTDIME_IA_ROOT:-}" && -d "$HOSTDIME_IA_ROOT" ]]; then
      printf '%s' "$HOSTDIME_IA_ROOT"
      return
    fi
  fi
  return 1
}

hostdime_read_version() {
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

hostdime_write_env() {
  local root="$1"
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  local version now
  version="$(hostdime_read_version "$root")"
  now="$(date -Iseconds)"
  mkdir -p "$cursor_dir"
  cat >"$cursor_dir/hostdime-ia.env" <<EOF
HOSTDIME_IA_ROOT=$root
HOSTDIME_IA_VERSION=$version
HOSTDIME_IA_INSTALLED_AT=$now
HOSTDIME_IA_LAST_SYNC=$now
EOF
}

hostdime_update_sync_time() {
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  local env_file="$cursor_dir/hostdime-ia.env"
  local root version now installed_at
  [[ -f "$env_file" ]] || return 0
  # shellcheck disable=SC1090
  source "$env_file"
  root="${HOSTDIME_IA_ROOT:-}"
  version="$(hostdime_read_version "$root")"
  now="$(date -Iseconds)"
  installed_at="${HOSTDIME_IA_INSTALLED_AT:-$now}"
  cat >"$env_file" <<EOF
HOSTDIME_IA_ROOT=$root
HOSTDIME_IA_VERSION=$version
HOSTDIME_IA_INSTALLED_AT=$installed_at
HOSTDIME_IA_LAST_SYNC=$now
EOF
}

hostdime_installed_version() {
  local env_file="${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env"
  [[ -f "$env_file" ]] || return 1
  # shellcheck disable=SC1090
  source "$env_file"
  printf '%s' "${HOSTDIME_IA_VERSION:-?}"
}
