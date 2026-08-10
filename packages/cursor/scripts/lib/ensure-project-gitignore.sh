#!/usr/bin/env bash
# Garante entradas no .gitignore do projeto para artefatos de review (hostdime-ia).
# Só age quando .cursor/ inteiro ainda não está ignorado.
#
# Source: source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/ensure-project-gitignore.sh"

HOSTDIME_GITIGNORE_MARKER='# hostdime-ia: cursor gerenciado localmente (npm run bootstrap)'

# Linhas órfãs a scrubar do .gitignore (comandos/rules espelhados no projeto — não reinstalar)
HOSTDIME_GITIGNORE_ORPHANS=(
  '.cursor/rules/skills-orchestrator-*.mdc'
  '.cursor/commands/avaliar.md'
  '.cursor/commands/finalizar.md'
  '.cursor/commands/avaliar-diff.md'
  '.cursor/commands/memoria.md'
  '.cursor/commands/skills-why.md'
  '.cursor/commands/hubspot-mcp.md'
  '.cursor/commands/cursor-cli.md'
  '.cursor/commands/historico.md'
  '.cursor/commands/sync-inbox.md'
  '.cursor/commands/onboard.md'
  '.cursor/commands/migrar-cursor.md'
  '.cursor/review/memoria.md'
  '.cursor/review/context.json'
)

LINK_GITIGNORE_SCRUBBED=0

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

# Remove ignores órfãos (orquestrador/commands) do bloco hostdime; garante fragmento review.
scrub_project_gitignore_hostdime() {
  local project="$1"
  local root="${HOSTDIME_IA_ROOT:-}"
  local gitignore="$project/.gitignore"
  local fragment orphan line tmp scrubbed=0

  LINK_GITIGNORE_SCRUBBED=0
  [[ -n "$root" && -d "$root" ]] || return 0
  [[ -f "$gitignore" ]] || return 0
  grep -qF "$HOSTDIME_GITIGNORE_MARKER" "$gitignore" || return 0

  fragment="$root/packages/cursor/scripts/lib/project-gitignore.fragment"
  tmp="$(mktemp)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    local drop=0
    for orphan in "${HOSTDIME_GITIGNORE_ORPHANS[@]}"; do
      if [[ "$line" == "$orphan" ]]; then
        drop=1
        scrubbed=$((scrubbed + 1))
        break
      fi
    done
    [[ "$drop" -eq 1 ]] && continue
    printf '%s\n' "$line" >>"$tmp"
  done <"$gitignore"
  mv "$tmp" "$gitignore"
  LINK_GITIGNORE_SCRUBBED=$scrubbed

  if [[ -f "$fragment" ]] && ! _cursor_dir_fully_ignored "$project"; then
    while IFS= read -r line; do
      [[ -n "$line" ]] || continue
      grep -qF "$line" "$gitignore" || echo "$line" >>"$gitignore"
    done <"$fragment"
  fi
}

count_project_gitignore_orphans() {
  local project="$1"
  local gitignore="$project/.gitignore"
  local orphan count=0

  [[ -f "$gitignore" ]] || {
    echo 0
    return 0
  }

  for orphan in "${HOSTDIME_GITIGNORE_ORPHANS[@]}"; do
    if grep -qxF "$orphan" "$gitignore"; then
      count=$((count + 1))
    fi
  done
  echo "$count"
}

ensure_project_gitignore() {
  local project="$1"
  local root="${HOSTDIME_IA_ROOT:-}"
  local fragment gitignore

  [[ -n "$root" && -d "$root" ]] || return 0

  fragment="$root/packages/cursor/scripts/lib/project-gitignore.fragment"
  [[ -f "$fragment" ]] || return 0

  scrub_project_gitignore_hostdime "$project"

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
