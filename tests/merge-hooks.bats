#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
}

teardown() {
  hostdime_test_teardown
}

@test "merge-hooks injeta sessionStart sem apagar hooks existentes" {
  hooks="$CURSOR_USER_DIR/hooks.json"
  cat >"$hooks" <<'JSON'
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [{ "command": "./custom.sh" }]
  }
}
JSON

  py="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/merge-hooks-json.py"
  example="$HOSTDIME_IA_ROOT/packages/cursor/scripts/hooks/hooks.json.example"

  run python3 "$py" "$hooks" "$example"
  [ "$status" -eq 0 ]
  [ "$output" = "merged" ]

  grep -q beforeSubmitPrompt "$hooks"
  grep -q ensure-project-cursor "$hooks"
}

@test "merge-hooks é idempotente" {
  hooks="$CURSOR_USER_DIR/hooks.json"
  py="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/merge-hooks-json.py"
  example="$HOSTDIME_IA_ROOT/packages/cursor/scripts/hooks/hooks.json.example"

  python3 "$py" "$hooks" "$example" >/dev/null
  run python3 "$py" "$hooks" "$example"
  [ "$output" = "ok" ]
}
