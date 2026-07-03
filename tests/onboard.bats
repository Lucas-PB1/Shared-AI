#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
}

teardown() {
  hostdime_test_teardown
}

@test "onboard bootstrap non-interactive com perfil next" {
  project="$(hostdime_make_project)"
  echo '{"dependencies":{"next":"14.0.0"}}' >"$project/package.json"

  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/onboard.sh" \
    --project="$project" \
    --profile=next \
    --yes \
    --no-code-review \
    --skip-extras >/dev/null

  [[ -f "$project/.cursor/rules/next-project.mdc" ]]
  grep -qF "$project" "$CURSOR_USER_DIR/hostdime-ia/projects.json"
}
