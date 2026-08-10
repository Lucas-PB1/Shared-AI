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

  ts="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/merge-hooks-json.ts"
  example="$HOSTDIME_IA_ROOT/packages/cursor/scripts/hooks/hooks.json.example"

  run hostdime_tsx "$ts" "$hooks" "$example"
  [ "$status" -eq 0 ]
  [ "$output" = "merged" ]

  grep -q beforeSubmitPrompt "$hooks"
  grep -q ensure-project-cursor "$hooks"
}

@test "merge-hooks é idempotente" {
  hooks="$CURSOR_USER_DIR/hooks.json"
  ts="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/merge-hooks-json.ts"
  example="$HOSTDIME_IA_ROOT/packages/cursor/scripts/hooks/hooks.json.example"

  hostdime_tsx "$ts" "$hooks" "$example" >/dev/null
  run hostdime_tsx "$ts" "$hooks" "$example"
  [ "$output" = "ok" ]
}
