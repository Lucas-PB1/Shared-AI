#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
}

teardown() {
  hostdime_test_teardown
}

@test "link-project cria review sem orquestrador nem commands no projeto" {
  project="$(hostdime_make_project)"
  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"

  [[ ! -e "$project/.cursor/rules/skills-orchestrator-base.mdc" ]]
  [[ ! -e "$project/.cursor/commands/avaliar.md" ]]
  [[ -d "$project/.cursor/review/inbox" ]]
  [[ -f "$project/.cursor/review/.memoria-version" ]]
  [[ ! -f "$project/.cursor/review/memoria.md" ]]
  [[ -L "$CURSOR_USER_DIR/rules/skills-orchestrator-base.mdc" ]]
  [[ -L "$CURSOR_USER_DIR/commands/avaliar.md" ]]
}

@test "link-project remove symlink antigo do orquestrador no projeto" {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/rules"
  ln -sf "$HOSTDIME_IA_ROOT/packages/cursor/rules/skills-orchestrator-base.mdc" \
    "$project/.cursor/rules/skills-orchestrator-base.mdc"

  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"

  [[ ! -e "$project/.cursor/rules/skills-orchestrator-base.mdc" ]]
}

@test "link-project remove symlink antigo de command no projeto" {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/commands"
  ln -sf "$HOSTDIME_IA_ROOT/packages/code-review/commands/avaliar.md" \
    "$project/.cursor/commands/avaliar.md"

  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"

  [[ ! -e "$project/.cursor/commands/avaliar.md" ]]
  [[ -L "$CURSOR_USER_DIR/commands/avaliar.md" ]]
}

@test "link-project não remove rule real do projeto com nome do orquestrador" {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/rules"
  echo "real" >"$project/.cursor/rules/skills-orchestrator-base.mdc"

  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"

  [[ ! -L "$project/.cursor/rules/skills-orchestrator-base.mdc" ]]
  grep -q real "$project/.cursor/rules/skills-orchestrator-base.mdc"
}

@test "link-project não remove command real do projeto" {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/commands"
  echo "local" >"$project/.cursor/commands/avaliar.md"

  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"

  [[ ! -L "$project/.cursor/commands/avaliar.md" ]]
  grep -q local "$project/.cursor/commands/avaliar.md"
}
