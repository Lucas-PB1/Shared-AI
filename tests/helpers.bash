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

  # Orquestrador global (espelha setup:skills) — isolado em CURSOR_USER_DIR
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install-packages.sh"
  install_skills_package "$HOSTDIME_IA_ROOT" >/dev/null
  install_code_review_package "$HOSTDIME_IA_ROOT" >/dev/null
}

hostdime_test_teardown() {
  [[ -n "${TEST_TMP:-}" ]] && rm -rf "$TEST_TMP"
}

hostdime_make_project() {
  local dir="$TEST_TMP/project"
  mkdir -p "$dir/.git"
  printf '%s' "$dir"
}

# Projeto git real (branch main) para smoke de review-diff / review-ci.
hostdime_make_git_project() {
  local dir="${1:-$TEST_TMP/review-project}"
  mkdir -p "$dir"
  git -C "$dir" init -q
  git -C "$dir" config user.email "test@hostdime.local"
  git -C "$dir" config user.name "HostDime Test"
  # default branch main (git 2.28+); fallback se config ignorada
  git -C "$dir" checkout -b main >/dev/null 2>&1 || true
  mkdir -p "$dir/.cursor/review/inbox" "$dir/.cursor/review/reports"
  printf '%s' "$dir"
}

# Semgrep mock (exit 0) — evita rede / config auto nos smokes do check-inbox.
hostdime_mock_semgrep() {
  mkdir -p "$TEST_TMP/bin"
  cat >"$TEST_TMP/bin/semgrep" <<'EOF'
#!/bin/sh
# mock: semgrep --config auto não roda em smoke offline
exit 0
EOF
  chmod +x "$TEST_TMP/bin/semgrep"
  export PATH="$TEST_TMP/bin:$PATH"
}

hostdime_count_orchestrator_symlinks() {
  local project="$1"
  find "$project/.cursor/rules" -maxdepth 1 -name 'skills-orchestrator-*.mdc' -type l 2>/dev/null | wc -l
}

hostdime_count_command_symlinks() {
  local project="$1"
  find "$project/.cursor/commands" -maxdepth 1 -name '*.md' -type l 2>/dev/null | wc -l
}

hostdime_tsx() {
  "$HOSTDIME_IA_ROOT/node_modules/.bin/tsx" "$@"
}
