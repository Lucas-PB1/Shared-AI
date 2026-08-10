#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
}

teardown() {
  hostdime_test_teardown
}

@test "finalizar arquivo do repo empacota no workdir tmp" {
  project="$(hostdime_make_project)"
  export CURSOR_PROJECT_DIR="$project"
  export HOSTDIME_IA_ROOT
  export HOSTDIME_REVIEW_WORKDIR
  HOSTDIME_REVIEW_WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/hd-rev.XXXXXX")"
  reports="$HOSTDIME_REVIEW_WORKDIR/reports"
  src="$project/app/Sample.php"
  mkdir -p "$(dirname "$src")" "$reports"

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
  [[ -f "$HOSTDIME_REVIEW_WORKDIR/resultados/2026-06-30_app-Sample/relatorio.md" ]]
  [[ -f "$HOSTDIME_REVIEW_WORKDIR/resultados/2026-06-30_app-Sample/codigo/Sample.php" ]] || \
    [[ -f "$HOSTDIME_REVIEW_WORKDIR/resultados/2026-06-30_app-Sample/codigo/app/Sample.php" ]]
}
