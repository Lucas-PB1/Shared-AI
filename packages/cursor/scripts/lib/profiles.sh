#!/usr/bin/env bash
# Lista e valida perfis de bootstrap (packages/cursor/profiles/*).

profiles_root_dir() {
  local root="${HOSTDIME_IA_ROOT:-}"
  [[ -n "$root" && -d "$root" ]] || return 1
  echo "$root/packages/cursor/profiles"
}

profiles_list() {
  local profiles_dir
  profiles_dir="$(profiles_root_dir)" || return 0
  local d name
  for d in "$profiles_dir"/*/; do
    [[ -d "$d" ]] || continue
    name="$(basename "$d")"
    [[ "$name" == "README.md" ]] && continue
    echo "$name"
  done | sort
}

profiles_format_list() {
  local items=()
  mapfile -t items < <(profiles_list)
  (IFS=', '; echo "${items[*]}")
}

profiles_is_valid() {
  local profile="$1"
  local profiles_dir
  [[ -n "$profile" ]] || return 1
  profiles_dir="$(profiles_root_dir)" || return 1
  [[ -d "$profiles_dir/$profile" ]]
}

profiles_usage_line() {
  echo "Perfis disponíveis: $(profiles_format_list)"
}

detect_project_profile() {
  local project="$1"
  local script="${BASH_SOURCE[0]%/*}/detect-stack.py"
  [[ -d "$project" ]] || return 0
  python3 "$script" "$project" 2>/dev/null || true
}
