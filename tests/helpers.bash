#!/usr/bin/env bash
# Helpers compartilhados pelos testes bats (ambiente isolado — não usa ~/.cursor real).

hostdime_test_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd
}

hostdime_test_setup() {
  export HOSTDIME_IA_ROOT="$(hostdime_test_root)"
  local tmp_base="${BATS_TMPDIR:-${TMPDIR:-/tmp}}"
  export TEST_TMP="${tmp_base}/hostdime-${BATS_TEST_NAME:-test}-$$"
  export CURSOR_USER_DIR="$TEST_TMP/cursor-user"
  export CURSOR_LINK_PROJECT_SCRIPT="$HOSTDIME_IA_ROOT/packages/cursor/scripts/link-project.sh"
  rm -rf "$TEST_TMP"
  mkdir -p "$CURSOR_USER_DIR"

  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/hostdime-env.sh"
  hostdime_write_env "$HOSTDIME_IA_ROOT"
}

hostdime_test_teardown() {
  [[ -n "${TEST_TMP:-}" ]] && rm -rf "$TEST_TMP"
}

hostdime_make_project() {
  local dir="$TEST_TMP/project"
  mkdir -p "$dir/.git"
  printf '%s' "$dir"
}

hostdime_count_orchestrator_symlinks() {
  local project="$1"
  find "$project/.cursor/rules" -maxdepth 1 -name 'skills-orchestrator-*.mdc' -type l 2>/dev/null | wc -l
}

hostdime_count_command_symlinks() {
  local project="$1"
  local count=0
  local cmd
  for cmd in avaliar.md finalizar.md avaliar-diff.md skills-why.md hubspot-mcp.md; do
    [[ -L "$project/.cursor/commands/$cmd" ]] && count=$((count + 1))
  done
  printf '%s' "$count"
}
