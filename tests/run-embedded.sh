#!/usr/bin/env bash
# Runner embutido (sem dependência de bats).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/tests/helpers.bash"

pass=0
fail=0

assert() {
  local desc="$1"
  shift
  if "$@"; then
    pass=$((pass + 1))
    echo "  ok: $desc"
  else
    fail=$((fail + 1))
    echo "  FAIL: $desc" >&2
  fi
}

run_test() {
  local name="$1"
  shift
  echo ""
  echo "TEST: $name"
  hostdime_test_setup
  "$@"
  hostdime_test_teardown
}

test_link_symlinks() {
  project="$(hostdime_make_project)"
  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"
  assert "orquestrador base" test -L "$project/.cursor/rules/skills-orchestrator-base.mdc"
  assert "command avaliar" test -L "$project/.cursor/commands/avaliar.md"
  assert "command hubspot-mcp" test -L "$project/.cursor/commands/hubspot-mcp.md"
  assert "rule hubspot" test -L "$project/.cursor/rules/skills-orchestrator-hubspot.mdc"
  assert "review inbox" test -d "$project/.cursor/review/inbox"
  assert "memoria template" test -f "$project/.cursor/review/memoria.md"
}

test_link_preserves_real() {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/rules"
  echo "real" >"$project/.cursor/rules/skills-orchestrator-base.mdc"
  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"
  assert "rule real preservada" test ! -L "$project/.cursor/rules/skills-orchestrator-base.mdc"
  assert "conteúdo real" grep -q real "$project/.cursor/rules/skills-orchestrator-base.mdc"
}

test_bootstrap_profile() {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/bootstrap-project.sh" \
    --profile=laravel "$project" >/dev/null
  assert "SKILLS-ROUTING" test -f "$project/.cursor/SKILLS-ROUTING.md"
  assert "laravel-project.mdc" test -f "$project/.cursor/rules/laravel-project.mdc"
  assert "registry" grep -qF "$project" "$CURSOR_USER_DIR/hostdime-ia/projects.json"
}

test_bootstrap_invalid_profile() {
  project="$(hostdime_make_project)"
  if bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/bootstrap-project.sh" \
    --profile=invalid "$project" >/dev/null 2>&1; then
    assert "perfil inválido falha" false
  else
    assert "perfil inválido falha" true
  fi
  assert "sem symlink" test ! -L "$project/.cursor/rules/skills-orchestrator-base.mdc"
}

test_detach() {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/bootstrap-project.sh" \
    --profile=react "$project" >/dev/null
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/detach-project.sh" \
    --keep-registry "$project" >/dev/null
  assert "symlinks rules removidos" test "$(hostdime_count_orchestrator_symlinks "$project")" -eq 0
  assert "symlinks commands removidos" test "$(hostdime_count_command_symlinks "$project")" -eq 0
  assert "react-project preservado" test -f "$project/.cursor/rules/react-project.mdc"
}

test_detach_registry() {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/bootstrap-project.sh" "$project" >/dev/null
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/detach-project.sh" "$project" >/dev/null
  if grep -qF "$project" "$CURSOR_USER_DIR/hostdime-ia/projects.json"; then
    assert "desregistrado" false
  else
    assert "desregistrado" true
  fi
}

test_merge_hooks() {
  hooks="$CURSOR_USER_DIR/hooks.json"
  cat >"$hooks" <<'JSON'
{"version":1,"hooks":{"beforeSubmitPrompt":[{"command":"./custom.sh"}]}}
JSON
  py="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/merge-hooks-json.py"
  example="$HOSTDIME_IA_ROOT/packages/cursor/scripts/hooks/hooks.json.example"
  result="$(python3 "$py" "$hooks" "$example")"
  assert "merge ok" test "$result" = "merged"
  assert "custom preservado" grep -q beforeSubmitPrompt "$hooks"
  assert "sessionStart" grep -q ensure-project-cursor "$hooks"
  result2="$(python3 "$py" "$hooks" "$example")"
  assert "idempotente" test "$result2" = "ok"
}

test_hubspot_mcp_install() {
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/hubspot-mcp.sh"
  mcp_file="$CURSOR_USER_DIR/mcp.json"
  printf '{"mcpServers":{"other":{"command":"echo"}}}\n' >"$mcp_file"
  "$HOSTDIME_IA_ROOT/packages/cursor/scripts/install-hubspot-mcp.sh" >/dev/null
  assert "HubSpotDev no mcp.json" grep -q HubSpotDev "$mcp_file"
  assert "status installed" test "$(hubspot_mcp_read_status)" = "installed"
  "$HOSTDIME_IA_ROOT/packages/cursor/scripts/install-hubspot-mcp.sh" --decline >/dev/null
  assert "status declined" test "$(hubspot_mcp_read_status)" = "declined"
}

test_hubspot_mcp_detect() {
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/hubspot-mcp.sh"
  printf '{"mcpServers":{"HubSpotDev":{"command":"npx"}}}\n' >"$CURSOR_USER_DIR/mcp.json"
  assert "mcp instalado" hubspot_mcp_installed
}

test_finalizar_inbox() {
  project="$(hostdime_make_project)"
  export CURSOR_PROJECT_DIR="$project"
  inbox="$project/.cursor/review/inbox"
  reports="$project/.cursor/review/reports"
  mkdir -p "$inbox" "$reports" "$project/.cursor/review/resultados"
  echo '<?php echo 1;' >"$inbox/sample.php"
  cat >"$reports/2026-06-30_review-sample.md" <<'MD'
## `.cursor/review/inbox/sample.php`
**Veredito:** OK
MD
  bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/finalizar-review.sh" \
    "$inbox/sample.php" >/dev/null
  assert "inbox limpo" test ! -f "$inbox/sample.php"
  assert "relatorio empacotado" test -f "$project/.cursor/review/resultados/2026-06-30_review-sample/relatorio.md"
}

test_finalizar_repo() {
  project="$(hostdime_make_project)"
  export CURSOR_PROJECT_DIR="$project"
  reports="$project/.cursor/review/reports"
  src="$project/app/Sample.php"
  mkdir -p "$(dirname "$src")" "$reports" "$project/.cursor/review/resultados"
  echo '<?php echo 1;' >"$src"
  cat >"$reports/2026-06-30_app-Sample.md" <<'MD'
## `app/Sample.php`
**Veredito:** OK
MD
  bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/finalizar-review.sh" "$src" >/dev/null
  assert "arquivo repo preservado" test -f "$src"
  assert "report removido" test ! -f "$reports/2026-06-30_app-Sample.md"
  assert "resultado criado" test -f "$project/.cursor/review/resultados/2026-06-30_app-Sample/relatorio.md"
}

echo "HostDime IA — testes (runner embutido)"

run_test "link symlinks" test_link_symlinks
run_test "link preserva real" test_link_preserves_real
run_test "bootstrap profile" test_bootstrap_profile
run_test "bootstrap invalid" test_bootstrap_invalid_profile
run_test "detach" test_detach
run_test "detach registry" test_detach_registry
run_test "merge hooks" test_merge_hooks
run_test "hubspot mcp install" test_hubspot_mcp_install
run_test "hubspot mcp detect" test_hubspot_mcp_detect
run_test "finalizar inbox" test_finalizar_inbox
run_test "finalizar repo" test_finalizar_repo

echo ""
echo "Resumo: $pass ok, $fail falha(s)"
test "$fail" -eq 0
