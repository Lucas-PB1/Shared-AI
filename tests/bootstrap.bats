#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
}

teardown() {
  hostdime_test_teardown
}

@test "bootstrap registra projeto e aplica perfil laravel" {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/bootstrap-project.sh" \
    --profile=laravel "$project" >/dev/null

  [[ -f "$project/.cursor/SKILLS-ROUTING.md" ]]
  [[ -f "$project/.cursor/rules/laravel-project.mdc" ]]
  [[ "$(hostdime_count_orchestrator_symlinks "$project")" -eq 0 ]]
  [[ -L "$CURSOR_USER_DIR/rules/skills-orchestrator-base.mdc" ]]

  grep -qF "$project" "$CURSOR_USER_DIR/hostdime-ia/projects.json"
}

@test "bootstrap perfil inválido falha antes de linkar" {
  project="$(hostdime_make_project)"
  run bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/bootstrap-project.sh" \
    --profile=invalid "$project"
  [ "$status" -eq 1 ]
  [[ ! -L "$project/.cursor/rules/skills-orchestrator-base.mdc" ]]
}
