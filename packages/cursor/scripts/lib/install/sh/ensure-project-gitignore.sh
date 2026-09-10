#!/usr/bin/env bash
# Remove ignores órfãos de installs antigos (orquestrador/commands globais).
SHARED_AI_GITIGNORE_ORPHANS=(
  '.cursor/rules/skills-orchestrator-*.mdc'
  '.cursor/commands/skills-why.md'
  '.cursor/commands/cursor-cli.md'
  '.cursor/commands/historico.md'
  '.cursor/commands/sync-inbox.md'
  '.cursor/commands/onboard.md'
  '.cursor/commands/automations.md'
  '.cursor/commands/criar-skill.md'
  '.cursor/commands/criar-rule.md'
)

LINK_GITIGNORE_SCRUBBED=0

scrub_project_gitignore_shared_ai() {
  local project="$1"
  local gitignore="$project/.gitignore"
  local orphan line tmp scrubbed=0

  LINK_GITIGNORE_SCRUBBED=0
  [[ -f "$gitignore" ]] || return 0

  tmp="$(mktemp)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    local drop=0
    for orphan in "${SHARED_AI_GITIGNORE_ORPHANS[@]}"; do
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
}

ensure_project_gitignore() {
  local project="$1"
  scrub_project_gitignore_shared_ai "$project"
}
