#!/usr/bin/env bash
# Garante entradas no .gitignore do projeto para artefatos gerenciados pelo hostdime-ia.
# Só age quando .cursor/ inteiro ainda não está ignorado.
#
# Source: source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/ensure-project-gitignore.sh"

HOSTDIME_GITIGNORE_MARKER='# hostdime-ia: cursor gerenciado localmente (npm run bootstrap)'

_cursor_dir_fully_ignored() {
  local project="$1"
  local gitignore="$project/.gitignore"

  if [[ -d "$project/.git" ]]; then
    git -C "$project" check-ignore -q "$project/.cursor" 2>/dev/null && return 0
  fi

  [[ -f "$gitignore" ]] || return 1

  grep -qE '^\.cursor/?$' "$gitignore" && return 0
  grep -qE '^\.cursor/\*$' "$gitignore" && return 0

  return 1
}

ensure_project_gitignore() {
  local project="$1"
  local root="${HOSTDIME_IA_ROOT:-}"
  local fragment gitignore

  [[ -n "$root" && -d "$root" ]] || return 0

  fragment="$root/packages/cursor/scripts/lib/project-gitignore.fragment"
  [[ -f "$fragment" ]] || return 0

  _cursor_dir_fully_ignored "$project" && return 0

  gitignore="$project/.gitignore"

  if [[ -f "$gitignore" ]] && grep -qF "$HOSTDIME_GITIGNORE_MARKER" "$gitignore"; then
    while IFS= read -r line; do
      [[ -n "$line" ]] || continue
      grep -qF "$line" "$gitignore" || echo "$line" >>"$gitignore"
    done <"$fragment"
    return 0
  fi

  {
    echo ""
    echo "$HOSTDIME_GITIGNORE_MARKER"
    cat "$fragment"
  } >>"$gitignore"
}
