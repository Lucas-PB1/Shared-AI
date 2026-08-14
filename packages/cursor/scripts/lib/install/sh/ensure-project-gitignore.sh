#!/usr/bin/env bash
# Garante .gitignore do projeto limpo (hostdime-ia).
# Memória/decisões: store Supabase — sem entradas de .cursor/review.
#
# Source: source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/sh/ensure-project-gitignore.sh"

HOSTDIME_GITIGNORE_MARKER='# hostdime-ia: cursor gerenciado localmente (npm run bootstrap)'

# Linhas órfãs a scrubar (symlinks antigos no projeto + paths de review no gitignore)
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

_is_review_gitignore_line() {
  local line="$1"
  local bare="${line#!}"
  bare="${bare#"${bare%%[![:space:]]*}"}" # trim leading space
  [[ "$bare" == .cursor/review ]] || [[ "$bare" == .cursor/review/* ]]
}

# Remove ignores órfãos do bloco hostdime (commands/rules + qualquer .cursor/review*).
scrub_project_gitignore_hostdime() {
  local project="$1"
  local gitignore="$project/.gitignore"
  local orphan line tmp scrubbed=0

  LINK_GITIGNORE_SCRUBBED=0
  [[ -f "$gitignore" ]] || return 0

  tmp="$(mktemp)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    local drop=0
    if _is_review_gitignore_line "$line"; then
      drop=1
      scrubbed=$((scrubbed + 1))
    else
      for orphan in "${HOSTDIME_GITIGNORE_ORPHANS[@]}"; do
        if [[ "$line" == "$orphan" ]]; then
          drop=1
          scrubbed=$((scrubbed + 1))
          break
        fi
      done
    fi
    [[ "$drop" -eq 1 ]] && continue
    printf '%s\n' "$line" >>"$tmp"
  done <"$gitignore"
  mv "$tmp" "$gitignore"
  LINK_GITIGNORE_SCRUBBED=$scrubbed
}

count_project_gitignore_orphans() {
  local project="$1"
  local gitignore="$project/.gitignore"
  local orphan count=0

  [[ -f "$gitignore" ]] || {
    echo 0
    return 0
  }

  while IFS= read -r line || [[ -n "$line" ]]; do
    if _is_review_gitignore_line "$line"; then
      count=$((count + 1))
      continue
    fi
    for orphan in "${HOSTDIME_GITIGNORE_ORPHANS[@]}"; do
      if [[ "$line" == "$orphan" ]]; then
        count=$((count + 1))
        break
      fi
    done
  done <"$gitignore"
  echo "$count"
}

# Remove pasta .cursor/review do projeto (store-only).
remove_project_review_dir() {
  local project="$1"
  local rev="$project/.cursor/review"
  if [[ -e "$rev" || -L "$rev" ]]; then
    rm -rf "$rev"
    return 0
  fi
  return 1
}

ensure_project_gitignore() {
  local project="$1"
  scrub_project_gitignore_hostdime "$project"
  # Sem fragmento de paths: memória no store, nada a ignorar sob .cursor/review
}
