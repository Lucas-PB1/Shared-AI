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
  assert "command historico" test -L "$project/.cursor/commands/historico.md"
  assert "command cursor-cli" test -L "$project/.cursor/commands/cursor-cli.md"
  assert "command sync-inbox" test -L "$project/.cursor/commands/sync-inbox.md"
  assert "rule hubspot" test -L "$project/.cursor/rules/skills-orchestrator-hubspot.mdc"
  assert "rule okf" test -L "$project/.cursor/rules/skills-orchestrator-okf.mdc"
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

test_boot_sync_toggle() {
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/boot-sync.sh"
  boot_sync_disable
  assert "off após disable" test "$(boot_sync_read_mode)" = "off"
  boot_sync_write_state "on" "1"
  assert "on após enable" test "$(boot_sync_read_mode)" = "on"
  boot_sync_write_state "off" "1"
  assert "off após write" test "$(boot_sync_read_mode)" = "off"
}

test_boot_sync_unset() {
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/boot-sync.sh"
  rm -f "$(boot_sync_state_file)"
  assert "unset sem state" test "$(boot_sync_read_mode)" = "unset"
  if boot_sync_was_asked; then
    assert "não perguntou ainda" false
  else
    assert "não perguntou ainda" true
  fi
}

test_boot_sync_prompt_skip() {
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/boot-sync.sh"
  export HOSTDIME_BOOT_SYNC_PROMPT=skip
  rm -f "$(boot_sync_state_file)"
  boot_sync_prompt_if_needed
  assert "skip mantém unset" test "$(boot_sync_read_mode)" = "unset"
  unset HOSTDIME_BOOT_SYNC_PROMPT
}

test_historico_validate() {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/history"
  cat >"$project/.cursor/history/watches.json" <<'JSON'
{"version":1,"watches":[{"id":"domain","scope":"src/domain/**","scopeKind":"glob","historyFile":"docs/log.md","format":"okf-log","enabled":true}]}
JSON
  py="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/history-watch-match.py"
  result="$(python3 "$py" validate "$project")"
  assert "watches valid" test "$result" = "ok"
}

test_historico_validate_invalid() {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/history"
  echo '{"version":1,"watches":[{"id":"Bad Id","scope":"x"}]}' >"$project/.cursor/history/watches.json"
  py="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/history-watch-match.py"
  if python3 "$py" validate "$project" >/dev/null 2>&1; then
    assert "watches invalid fails" false
  else
    assert "watches invalid fails" true
  fi
}

test_historico_scope_match() {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/history"
  cat >"$project/.cursor/history/watches.json" <<'JSON'
{"version":1,"watches":[{"id":"domain","scope":"src/domain/**","scopeKind":"glob","historyFile":"docs/log.md","format":"okf-log","enabled":true}]}
JSON
  py="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/history-watch-match.py"
  if python3 "$py" scope-match "$project" "src/domain/order.ts" >/dev/null 2>&1; then
    assert "scope match hit" true
  else
    assert "scope match hit" false
  fi
  if python3 "$py" scope-match "$project" "src/other/x.ts" >/dev/null 2>&1; then
    assert "scope match miss" false
  else
    assert "scope match miss" true
  fi
}

test_historico_merge_hooks() {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/history" "$project/.cursor/hooks"
  cat >"$project/.cursor/history/watches.json" <<'JSON'
{"version":1,"watches":[{"id":"api","scope":"src/**","scopeKind":"glob","historyFile":"history.md","format":"markdown","enabled":true}]}
JSON
  py="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/merge-historico-hooks.py"
  hooks="$project/.cursor/hooks.json"
  result="$(python3 "$py" "$hooks" "$project")"
  assert "historico merge created" test "$result" = "created"
  assert "stop hook" grep -q historico-stop "$hooks"
  result2="$(python3 "$py" "$hooks" "$project")"
  assert "historico merge idempotent" test "$result2" = "ok"
}

test_historico_templates() {
  tpl="$HOSTDIME_IA_ROOT/packages/cursor/templates"
  assert "template okf log" test -f "$tpl/history-log.okf.md"
  assert "template md" test -f "$tpl/history-log.md"
  assert "template rule" test -f "$tpl/history-watch-rule.mdc"
  assert "template schema" test -f "$tpl/watches.schema.json"
  assert "okf template heading" grep -q "Directory Update Log" "$tpl/history-log.okf.md"
  assert "md template o quê" grep -q "O quê" "$tpl/history-log.md"
}

test_cursor_cli_merge_config() {
  project="$(hostdime_make_project)"
  config="$project/cli-config.json"
  tpl="$HOSTDIME_IA_ROOT/packages/cursor/templates/cli-config.auto.json"
  py="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/merge-cursor-cli-config.py"
  result="$(python3 "$py" "$config" "$tpl")"
  assert "cli config created" test "$result" = "created"
  assert "approval unrestricted" grep -q '"approvalMode": "unrestricted"' "$config"
  assert "deny rm" grep -q 'Shell(rm)' "$config"
  echo '{"version":1,"editor":{"vimMode":true},"permissions":{"allow":["Shell(ls)"],"deny":[]}}' >"$config"
  result2="$(python3 "$py" "$config" "$tpl")"
  assert "cli config merged" test "$result2" = "merged"
  assert "vim preserved" grep -q '"vimMode": true' "$config"
  assert "allow ls preserved" grep -q 'Shell(ls)' "$config"
  result3="$(python3 "$py" "$config" "$tpl")"
  assert "cli config idempotent" test "$result3" = "ok"
}

test_cursor_cli_dry_run() {
  export HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT"
  out="$(bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/install-cursor-cli.sh" install --dry-run 2>&1)"
  assert "dry-run install" grep -q 'dry-run' <<<"$out"
  if grep -q 'cursor.com/install' <<<"$out" || grep -q 'já instalado' <<<"$out"; then
    assert "dry-run install step" true
  else
    assert "dry-run install step" false
  fi
}

test_agent_wrapper_dry_run() {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/rules"
  out="$(bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/agent-cli.sh" --dry-run --project="$project" "fix lint" 2>&1)"
  assert "agent dry-run project" grep -qF "$project" <<<"$out"
  assert "agent dry-run args" grep -q 'fix lint' <<<"$out"
  assert "agent dry-run approve mcps" grep -q 'approve-mcps' <<<"$out"
}

test_sync_inbox_scan() {
  project="$(hostdime_make_project)"
  mkdir -p "$CURSOR_USER_DIR/hostdime-ia"
  git -C "$project" init -q
  git -C "$project" config user.email "test@test.com"
  git -C "$project" config user.name "test"
  echo "base" >"$project/README.md"
  git -C "$project" add README.md
  git -C "$project" commit -q -m "initial"
  echo "wip" >>"$project/README.md"
  printf '{"projects":[{"path":"%s"}]}' "$project" >"$CURSOR_USER_DIR/hostdime-ia/projects.json"
  py="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/scan-sync-inbox.py"
  out="$(python3 "$py")"
  assert "sync-inbox scan hit" grep -q '"changedCount"' <<<"$out"
  assert "sync-inbox scan project" grep -qF "$project" <<<"$out"
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
run_test "boot sync toggle" test_boot_sync_toggle
run_test "boot sync unset" test_boot_sync_unset
run_test "boot sync prompt skip" test_boot_sync_prompt_skip
run_test "historico validate" test_historico_validate
run_test "historico validate invalid" test_historico_validate_invalid
run_test "historico scope match" test_historico_scope_match
run_test "historico merge hooks" test_historico_merge_hooks
run_test "historico templates" test_historico_templates
run_test "cursor cli merge config" test_cursor_cli_merge_config
run_test "cursor cli dry run" test_cursor_cli_dry_run
run_test "agent wrapper dry run" test_agent_wrapper_dry_run
run_test "sync-inbox scan" test_sync_inbox_scan

echo ""
echo "Resumo: $pass ok, $fail falha(s)"
test "$fail" -eq 0
