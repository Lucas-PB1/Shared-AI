#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
}

teardown() {
  hostdime_test_teardown
}

@test "health reporta projeto registrado" {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/bootstrap-project.sh" \
    --profile=python "$project" >/dev/null

  run bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/health.sh"
  [ "$status" -eq 0 ]
  [[ "$output" == *"python"* ]]
  [[ "$output" == *"$(basename "$project")"* ]]
}

@test "health --json inclui projetos" {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/bootstrap-project.sh" \
    "$project" >/dev/null

  run bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/health.sh" --json
  [ "$status" -eq 0 ]
  [[ "$output" == *"\"project_count\": 1"* ]]
}
