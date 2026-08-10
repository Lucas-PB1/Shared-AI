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
  run bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-diff.sh" HEAD
  [ "$status" -eq 0 ]
  [[ -z "${output//$'\n'/}" ]] || [[ "$output" != *".js"* && "$output" != *".mjs"* ]]

  run env HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" \
    bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-ci.sh" HEAD
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
  run bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-diff.sh" HEAD~1
  [ "$status" -eq 0 ]
  [[ "$output" == *"src/ok.mjs"* ]]

  run env HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" \
    bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-ci.sh" HEAD~1
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
    bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/check-inbox.sh" "$project/src/ok.mjs"
  [ "$status" -eq 0 ]
}

@test "export exclusions a partir de context no workdir" {
  project="$(hostdime_make_git_project)"
  export HOSTDIME_REVIEW_WORKDIR
  HOSTDIME_REVIEW_WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/hd-rev.XXXXXX")"
  mkdir -p "$HOSTDIME_REVIEW_WORKDIR"
  cp "$HOSTDIME_IA_ROOT/tests/fixtures/review/context.yaml" \
    "$HOSTDIME_REVIEW_WORKDIR/context.yaml"

  run bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-export-exclusions.sh" "$project"
  [ "$status" -eq 0 ]
  [ -f "$HOSTDIME_REVIEW_WORKDIR/exclusions.yaml" ]
  grep -q 'accepted-repo-pattern' "$HOSTDIME_REVIEW_WORKDIR/exclusions.yaml"
  ! grep -q 'still-pending' "$HOSTDIME_REVIEW_WORKDIR/exclusions.yaml"
  [[ ! -d "$project/.cursor/review" ]]
}

@test "smoke ingest sem gh" {
  run "$HOSTDIME_IA_ROOT/node_modules/.bin/tsx" "$HOSTDIME_IA_ROOT/tests/smoke_review_ingest.ts"
  [ "$status" -eq 0 ]
  [[ "$output" == *"smoke_review_ingest: OK"* ]]
}

@test "lint ts tsc noEmit" {
  run bash "$HOSTDIME_IA_ROOT/tests/lint-ts.sh"
  [ "$status" -eq 0 ]
  [[ "$output" == *"tsc: OK"* ]]
}
