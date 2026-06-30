#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
}

teardown() {
  hostdime_test_teardown
}

@test "link-project cria symlinks do orquestrador" {
  project="$(hostdime_make_project)"
  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"

  [[ -L "$project/.cursor/rules/skills-orchestrator-base.mdc" ]]
  [[ -L "$project/.cursor/commands/avaliar.md" ]]
  [[ -d "$project/.cursor/review/inbox" ]]
  [[ -f "$project/.cursor/review/memoria.md" ]]
}

@test "link-project não sobrescreve rule real do projeto" {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/rules"
  echo "real" >"$project/.cursor/rules/skills-orchestrator-base.mdc"

  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"

  [[ ! -L "$project/.cursor/rules/skills-orchestrator-base.mdc" ]]
  grep -q real "$project/.cursor/rules/skills-orchestrator-base.mdc"
}
