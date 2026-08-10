#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
}

teardown() {
  hostdime_test_teardown
}

@test "detect-stack identifica next" {
  project="$(hostdime_make_project)"
  echo '{"dependencies":{"next":"14.0.0"}}' >"$project/package.json"
  run hostdime_tsx "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/detect-stack.ts" "$project"
  [ "$status" -eq 0 ]
  [ "$output" = "next" ]
}

@test "detect-stack identifica python" {
  project="$(hostdime_make_project)"
  touch "$project/pyproject.toml"
  run hostdime_tsx "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/detect-stack.ts" "$project"
  [ "$status" -eq 0 ]
  [ "$output" = "python" ]
}

@test "detect-stack identifica zend-laminas" {
  project="$(hostdime_make_project)"
  echo '{"require":{"laminas/laminas-mvc":"^3.0"}}' >"$project/composer.json"
  run hostdime_tsx "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/detect-stack.ts" "$project"
  [ "$status" -eq 0 ]
  [ "$output" = "zend-laminas" ]
}

@test "bootstrap aplica perfil next" {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/bootstrap-project.sh" \
    --profile=next "$project" >/dev/null

  [[ -f "$project/.cursor/SKILLS-ROUTING.md" ]]
  [[ -f "$project/.cursor/rules/next-project.mdc" ]]
}

@test "bootstrap aplica perfil python" {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/bootstrap-project.sh" \
    --profile=python "$project" >/dev/null

  [[ -f "$project/.cursor/rules/python-project.mdc" ]]
}

@test "profiles_list inclui perfis novos" {
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/profiles.sh"
  list="$(profiles_list)"
  [[ "$list" == *"next"* ]]
  [[ "$list" == *"python"* ]]
  [[ "$list" == *"zend-laminas"* ]]
}
