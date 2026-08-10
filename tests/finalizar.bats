#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
}

teardown() {
  hostdime_test_teardown
}

@test "finalizar inbox remove snippet e relatório" {
  project="$(hostdime_make_project)"
  export CURSOR_PROJECT_DIR="$project"
  inbox="$project/.cursor/review/inbox"
  reports="$project/.cursor/review/reports"
  mkdir -p "$inbox" "$reports" "$project/.cursor/review/resultados"

  cat >"$inbox/sample.php" <<'PHP'
<?php
echo 'ok';
PHP

  cat >"$reports/2026-06-30_review-sample.md" <<'MD'
## `.cursor/review/inbox/sample.php`

**Stack:** PHP
**Veredito:** OK
MD

  run bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/finalizar-review.sh" \
    "$inbox/sample.php"
  [ "$status" -eq 0 ]

  [[ ! -f "$inbox/sample.php" ]]
  [[ ! -f "$reports/2026-06-30_review-sample.md" ]]
  [[ -f "$project/.cursor/review/resultados/2026-06-30_review-sample/relatorio.md" ]]
}

@test "finalizar arquivo do repo preserva original" {
  project="$(hostdime_make_project)"
  export CURSOR_PROJECT_DIR="$project"
  reports="$project/.cursor/review/reports"
  src="$project/app/Sample.php"
  mkdir -p "$(dirname "$src")" "$reports" "$project/.cursor/review/resultados"

  echo '<?php echo 1;' >"$src"

  cat >"$reports/2026-06-30_app-Sample.md" <<'MD'
## `app/Sample.php`

**Stack:** PHP
**Veredito:** OK
MD

  run bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/finalizar-review.sh" "$src"
  [ "$status" -eq 0 ]

  [[ -f "$src" ]]
  [[ ! -f "$reports/2026-06-30_app-Sample.md" ]]
  [[ -f "$project/.cursor/review/resultados/2026-06-30_app-Sample/relatorio.md" ]]
  [[ -f "$project/.cursor/review/resultados/2026-06-30_app-Sample/codigo/app/Sample.php" ]]
  grep -q "origem: projeto" "$project/.cursor/review/resultados/2026-06-30_app-Sample/meta.txt"
}
