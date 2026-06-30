#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
}

teardown() {
  hostdime_test_teardown
}

@test "finalizar empacota relatório e limpa inbox" {
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

  run bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/finalizar-review.sh" \
    "$inbox/sample.php"
  [ "$status" -eq 0 ]

  [[ ! -f "$inbox/sample.php" ]]
  [[ ! -f "$reports/2026-06-30_review-sample.md" ]]
  [[ -f "$project/.cursor/review/resultados/2026-06-30_review-sample/relatorio.md" ]]
  [[ -f "$project/.cursor/review/resultados/2026-06-30_review-sample/codigo/sample.php" ]]
  grep -q "Veredito:" "$project/.cursor/review/resultados/2026-06-30_review-sample/meta.txt"
}
