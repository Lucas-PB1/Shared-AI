#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
}

teardown() {
  hostdime_test_teardown
}

@test "detach remove symlinks e preserva arquivos do perfil" {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/bootstrap-project.sh" \
    --profile=react "$project" >/dev/null

  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/detach-project.sh" \
    --keep-registry "$project" >/dev/null

  [[ "$(hostdime_count_orchestrator_symlinks "$project")" -eq 0 ]]
  [[ "$(hostdime_count_command_symlinks "$project")" -eq 0 ]]
  [[ -f "$project/.cursor/rules/react-project.mdc" ]]
  [[ -f "$project/.cursor/SKILLS-ROUTING.md" ]]
  [[ -f "$project/.cursor/review/memoria.md" ]]
}

@test "detach desregistra projeto do registry por padrão" {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/bootstrap-project.sh" "$project" >/dev/null

  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/detach-project.sh" "$project" >/dev/null

  ! grep -qF "$project" "$CURSOR_USER_DIR/hostdime-ia/projects.json"
}
