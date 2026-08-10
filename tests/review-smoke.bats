#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
}

teardown() {
  hostdime_test_teardown
}

@test "review-diff vazio e review-ci sem arquivos" {
  project="$(hostdime_make_git_project)"
  printf 'readme\n' >"$project/README.md"
  git -C "$project" add README.md
  git -C "$project" commit -q -m "init non-reviewable"

  export CURSOR_PROJECT_DIR="$project"
  run bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/review-diff.sh" HEAD
  [ "$status" -eq 0 ]
  [[ -z "${output//$'\n'/}" ]] || [[ "$output" != *".js"* && "$output" != *".mjs"* ]]

  run env HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" \
    bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/review-ci.sh" HEAD
  [ "$status" -eq 0 ]
  [[ "$output" == *"Nenhum arquivo revisável"* ]]
}

@test "review-diff lista arquivo e review-ci limpo" {
  project="$(hostdime_make_git_project)"
  hostdime_mock_semgrep
  printf 'readme\n' >"$project/README.md"
  git -C "$project" add README.md
  git -C "$project" commit -q -m "init"
  mkdir -p "$project/src"
  cp "$HOSTDIME_IA_ROOT/tests/fixtures/review/sample-ok.mjs" "$project/src/ok.mjs"
  git -C "$project" add src/ok.mjs
  git -C "$project" commit -q -m "add reviewable js"

  export CURSOR_PROJECT_DIR="$project"
  run bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/review-diff.sh" HEAD~1
  [ "$status" -eq 0 ]
  [[ "$output" == *"src/ok.mjs"* ]]

  run env HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" \
    bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/review-ci.sh" HEAD~1
  [ "$status" -eq 0 ]
  [[ "$output" == *"CI review: OK"* ]]
}

@test "check-inbox em js limpo" {
  project="$(hostdime_make_git_project)"
  hostdime_mock_semgrep
  mkdir -p "$project/src"
  cp "$HOSTDIME_IA_ROOT/tests/fixtures/review/sample-ok.mjs" "$project/src/ok.mjs"
  export CURSOR_PROJECT_DIR="$project"

  run env HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" REVIEW_CHECK_CI=1 \
    bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/check-inbox.sh" "$project/src/ok.mjs"
  [ "$status" -eq 0 ]
}

@test "export exclusions a partir de context.yaml" {
  project="$(hostdime_make_git_project)"
  mkdir -p "$project/.cursor/review"
  cp "$HOSTDIME_IA_ROOT/tests/fixtures/review/context.yaml" \
    "$project/.cursor/review/context.yaml"

  run bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/review-export-exclusions.sh" "$project"
  [ "$status" -eq 0 ]
  [ -f "$project/.cursor/review/exclusions.yaml" ]
  grep -q 'legacy-repo-pattern' "$project/.cursor/review/exclusions.yaml"
  ! grep -q 'still-pending' "$project/.cursor/review/exclusions.yaml"
}

@test "smoke ingest python sem gh" {
  run python3 "$HOSTDIME_IA_ROOT/tests/smoke_review_ingest.py"
  [ "$status" -eq 0 ]
  [[ "$output" == *"smoke_review_ingest: OK"* ]]
}

@test "lint python tools py_compile" {
  run bash "$HOSTDIME_IA_ROOT/tests/lint-python.sh"
  [ "$status" -eq 0 ]
}
