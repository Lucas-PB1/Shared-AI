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

hostdime_tsx() {
  local root="${HOSTDIME_IA_ROOT:-$ROOT}"
  "$root/node_modules/.bin/tsx" "$@"
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
  assert "sem orquestrador no projeto" test ! -e "$project/.cursor/rules/skills-orchestrator-base.mdc"
  assert "sem command no projeto" test ! -e "$project/.cursor/commands/avaliar.md"
  assert "orquestrador global" test -L "$CURSOR_USER_DIR/rules/skills-orchestrator-base.mdc"
  assert "sem pasta review no projeto" test ! -d "$project/.cursor/review"
  assert "command avaliar global" test -L "$CURSOR_USER_DIR/commands/avaliar.md"
  assert "command memoria global" test -L "$CURSOR_USER_DIR/commands/memoria.md"
  assert "command hubspot-mcp global" test -L "$CURSOR_USER_DIR/commands/hubspot-mcp.md"
  assert "command historico global" test -L "$CURSOR_USER_DIR/commands/historico.md"
  assert "command cursor-cli global" test -L "$CURSOR_USER_DIR/commands/cursor-cli.md"
  assert "command sync-inbox global" test -L "$CURSOR_USER_DIR/commands/sync-inbox.md"
  assert "command onboard global" test -L "$CURSOR_USER_DIR/commands/onboard.md"
  assert "rule hubspot global" test -L "$CURSOR_USER_DIR/rules/skills-orchestrator-hubspot.mdc"
  assert "rule okf global" test -L "$CURSOR_USER_DIR/rules/skills-orchestrator-okf.mdc"
}

test_link_removes_project_orchestrator() {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/rules"
  ln -sf "$HOSTDIME_IA_ROOT/packages/cursor/rules/skills-orchestrator-base.mdc" \
    "$project/.cursor/rules/skills-orchestrator-base.mdc"
  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"
  assert "orquestrador não no projeto" test ! -e "$project/.cursor/rules/skills-orchestrator-base.mdc"
}

test_link_removes_project_command() {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/commands"
  ln -sf "$HOSTDIME_IA_ROOT/packages/code-review/commands/avaliar.md" \
    "$project/.cursor/commands/avaliar.md"
  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"
  assert "command não no projeto" test ! -e "$project/.cursor/commands/avaliar.md"
  assert "command global" test -L "$CURSOR_USER_DIR/commands/avaliar.md"
}

test_gitignore_scrub_orphans() {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/rules" "$project/.cursor/commands"
  cat >"$project/.gitignore" <<'EOF'
# hostdime-ia: cursor gerenciado localmente (npm run bootstrap)
.cursor/rules/skills-orchestrator-*.mdc
.cursor/commands/avaliar.md
.cursor/review/memoria.md
.cursor/review/
!.cursor/review/inbox/.gitkeep
EOF
  mkdir -p "$project/.cursor/review/inbox"
  touch "$project/.cursor/review/inbox/.gitkeep"
  ln -sf "$HOSTDIME_IA_ROOT/packages/cursor/rules/skills-orchestrator-base.mdc" \
    "$project/.cursor/rules/skills-orchestrator-base.mdc"
  ln -sf "$HOSTDIME_IA_ROOT/packages/code-review/commands/avaliar.md" \
    "$project/.cursor/commands/avaliar.md"

  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/sh/ensure-project-gitignore.sh"
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/sh/link-from-repo.sh"
  export HOSTDIME_IA_ROOT
  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"

  assert "symlink rules removido" test ! -e "$project/.cursor/rules/skills-orchestrator-base.mdc"
  assert "symlink command removido" test ! -e "$project/.cursor/commands/avaliar.md"
  if grep -qxF '.cursor/rules/skills-orchestrator-*.mdc' "$project/.gitignore"; then
    assert "ignore orquestrador scrub" false
  else
    assert "ignore orquestrador scrub" true
  fi
  if grep -qxF '.cursor/commands/avaliar.md' "$project/.gitignore"; then
    assert "ignore avaliar scrub" false
  else
    assert "ignore avaliar scrub" true
  fi
  if grep -qxF '.cursor/review/memoria.md' "$project/.gitignore"; then
    assert "ignore memoria.md scrub" false
  else
    assert "ignore memoria.md scrub" true
  fi
  if grep -qE '^\.cursor/review(/|$)' "$project/.gitignore"; then
    assert "sem ignore review no gitignore" false
  else
    assert "sem ignore review no gitignore" true
  fi
  assert "pasta review removida se existia" test ! -d "$project/.cursor/review"
}

test_link_preserves_real() {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/rules"
  echo "real" >"$project/.cursor/rules/skills-orchestrator-base.mdc"
  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"
  assert "rule real preservada" test ! -L "$project/.cursor/rules/skills-orchestrator-base.mdc"
  assert "conteúdo real" grep -q real "$project/.cursor/rules/skills-orchestrator-base.mdc"
}

test_link_preserves_real_command() {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/commands"
  echo "local" >"$project/.cursor/commands/avaliar.md"
  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"
  assert "command real preservado" test ! -L "$project/.cursor/commands/avaliar.md"
  assert "conteúdo local" grep -q local "$project/.cursor/commands/avaliar.md"
}

test_bootstrap_profile() {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/bootstrap-project.sh" \
    --profile=laravel "$project" >/dev/null
  assert "SKILLS-ROUTING" test -f "$project/.cursor/SKILLS-ROUTING.md"
  assert "laravel-project.mdc" test -f "$project/.cursor/rules/laravel-project.mdc"
  assert "registry" grep -qF "$project" "$CURSOR_USER_DIR/hostdime-ia/projects.json"
}

test_bootstrap_invalid_profile() {
  project="$(hostdime_make_project)"
  if bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/bootstrap-project.sh" \
    --profile=invalid "$project" >/dev/null 2>&1; then
    assert "perfil inválido falha" false
  else
    assert "perfil inválido falha" true
  fi
  assert "sem symlink" test ! -L "$project/.cursor/rules/skills-orchestrator-base.mdc"
}

test_detach() {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/bootstrap-project.sh" \
    --profile=react "$project" >/dev/null
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/detach-project.sh" \
    --keep-registry "$project" >/dev/null
  assert "symlinks rules removidos" test "$(hostdime_count_orchestrator_symlinks "$project")" -eq 0
  assert "symlinks commands removidos" test "$(hostdime_count_command_symlinks "$project")" -eq 0
  assert "react-project preservado" test -f "$project/.cursor/rules/react-project.mdc"
}

test_detach_registry() {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/bootstrap-project.sh" "$project" >/dev/null
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/detach-project.sh" "$project" >/dev/null
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
  ts="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/ts/merge-hooks-json.ts"
  example="$HOSTDIME_IA_ROOT/packages/cursor/scripts/hooks/hooks.json.example"
  result="$(hostdime_tsx "$ts" "$hooks" "$example")"
  assert "merge ok" test "$result" = "merged"
  assert "custom preservado" grep -q beforeSubmitPrompt "$hooks"
  assert "sessionStart" grep -q ensure-project-cursor "$hooks"
  result2="$(hostdime_tsx "$ts" "$hooks" "$example")"
  assert "idempotente" test "$result2" = "ok"
}

test_hubspot_mcp_install() {
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/hubspot/sh/hubspot-mcp.sh"
  mcp_file="$CURSOR_USER_DIR/mcp.json"
  printf '{"mcpServers":{"other":{"command":"echo"}}}\n' >"$mcp_file"
  "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/install-hubspot-mcp.sh" >/dev/null
  assert "HubSpotDev no mcp.json" grep -q HubSpotDev "$mcp_file"
  assert "status installed" test "$(hubspot_mcp_read_status)" = "installed"
  "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/install-hubspot-mcp.sh" --decline >/dev/null
  assert "status declined" test "$(hubspot_mcp_read_status)" = "declined"
}

test_hubspot_mcp_detect() {
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/hubspot/sh/hubspot-mcp.sh"
  printf '{"mcpServers":{"HubSpotDev":{"command":"npx"}}}\n' >"$CURSOR_USER_DIR/mcp.json"
  assert "mcp instalado" hubspot_mcp_installed
}

test_finalizar_repo() {
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
**Veredito:** OK
MD
  bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/finalizar-review.sh" "$src" >/dev/null
  assert "arquivo repo preservado" test -f "$src"
  assert "report removido" test ! -f "$reports/2026-06-30_app-Sample.md"
  assert "resultado criado" test -f "$HOSTDIME_REVIEW_WORKDIR/resultados/2026-06-30_app-Sample/relatorio.md"
  assert "sem pasta review no projeto" test ! -d "$project/.cursor/review"
}

test_boot_sync_toggle() {
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/sh/boot-sync.sh"
  boot_sync_disable
  assert "off após disable" test "$(boot_sync_read_mode)" = "off"
  boot_sync_write_state "on" "1"
  assert "on após enable" test "$(boot_sync_read_mode)" = "on"
  boot_sync_write_state "off" "1"
  assert "off após write" test "$(boot_sync_read_mode)" = "off"
}

test_boot_sync_unset() {
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/sh/boot-sync.sh"
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
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/sh/boot-sync.sh"
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
  ts="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/history/history-watch-match.ts"
  result="$(hostdime_tsx "$ts" validate "$project")"
  assert "watches valid" test "$result" = "ok"
}

test_historico_validate_invalid() {
  project="$(hostdime_make_project)"
  mkdir -p "$project/.cursor/history"
  echo '{"version":1,"watches":[{"id":"Bad Id","scope":"x"}]}' >"$project/.cursor/history/watches.json"
  ts="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/history/history-watch-match.ts"
  if hostdime_tsx "$ts" validate "$project" >/dev/null 2>&1; then
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
  ts="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/history/history-watch-match.ts"
  if hostdime_tsx "$ts" scope-match "$project" "src/domain/order.ts" >/dev/null 2>&1; then
    assert "scope match hit" true
  else
    assert "scope match hit" false
  fi
  if hostdime_tsx "$ts" scope-match "$project" "src/other/x.ts" >/dev/null 2>&1; then
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
  ts="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/history/merge-historico-hooks.ts"
  hooks="$project/.cursor/hooks.json"
  result="$(hostdime_tsx "$ts" "$hooks" "$project")"
  assert "historico merge created" test "$result" = "created"
  assert "stop hook" grep -q historico-stop "$hooks"
  result2="$(hostdime_tsx "$ts" "$hooks" "$project")"
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

test_historico_pending_catchup() {
  project="$(hostdime_make_project)"
  git -C "$project" init -q
  git -C "$project" config user.email "test@test.com"
  git -C "$project" config user.name "test"
  mkdir -p "$project/src/domain" "$project/docs" "$project/.cursor/history"
  cat >"$project/.cursor/history/watches.json" <<'JSON'
{"version":1,"watches":[{"id":"domain","scope":"src/domain/**","scopeKind":"glob","historyFile":"docs/log.md","format":"okf-log","enabled":true}]}
JSON
  cp "$HOSTDIME_IA_ROOT/packages/cursor/templates/history-log.okf.md" "$project/docs/log.md"
  echo "base" >"$project/README.md"
  git -C "$project" add .
  git -C "$project" commit -q -m "initial"
  echo "change" >"$project/src/domain/order.ts"
  git -C "$project" add src/domain/order.ts

  ts="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/history/history-watch-match.ts"
  pending="$(hostdime_tsx "$ts" pending "$project")"
  assert "pending lists domain file" grep -q "src/domain/order.ts" <<<"$pending"

  catchup="$(hostdime_tsx "$ts" catch-up "$project")"
  assert "catch-up has draft" grep -q "docs/log.md" <<<"$catchup"
  assert "catch-up has placeholder" grep -q "<descreva" <<<"$catchup"

  json="$(hostdime_tsx "$ts" catch-up --json "$project")"
  assert "catch-up json pending" grep -q '"hasPending": true' <<<"$json"
}

test_cursor_cli_merge_config() {
  project="$(hostdime_make_project)"
  config="$project/cli-config.json"
  tpl="$HOSTDIME_IA_ROOT/packages/cursor/templates/cli-config.auto.json"
  ts="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/ts/merge-cursor-cli-config.ts"
  result="$(hostdime_tsx "$ts" "$config" "$tpl")"
  assert "cli config created" test "$result" = "created"
  assert "approval unrestricted" grep -q '"approvalMode": "unrestricted"' "$config"
  assert "deny rm" grep -q 'Shell(rm)' "$config"
  echo '{"version":1,"editor":{"vimMode":true},"permissions":{"allow":["Shell(ls)"],"deny":[]}}' >"$config"
  result2="$(hostdime_tsx "$ts" "$config" "$tpl")"
  assert "cli config merged" test "$result2" = "merged"
  assert "vim preserved" grep -q '"vimMode": true' "$config"
  assert "allow ls preserved" grep -q 'Shell(ls)' "$config"
  result3="$(hostdime_tsx "$ts" "$config" "$tpl")"
  assert "cli config idempotent" test "$result3" = "ok"
}

test_cursor_cli_dry_run() {
  export HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT"
  out="$(bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/install-cursor-cli.sh" install --dry-run 2>&1)"
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
  out="$(bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/agent-cli.sh" --dry-run --project="$project" "fix lint" 2>&1)"
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
  ts="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/sync-inbox/ts/scan-sync-inbox.ts"
  out="$(hostdime_tsx "$ts")"
  assert "sync-inbox scan hit" grep -q '"changedCount"' <<<"$out"
  assert "sync-inbox scan project" grep -qF "$project" <<<"$out"
  assert "sync-inbox summary field" grep -q '"summary"' <<<"$out"
  assert "sync-inbox cards script" test -f "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/sync-inbox/ts/sync-inbox-cards.ts"
}

test_profiles_detect_and_bootstrap() {
  project="$(hostdime_make_project)"
  echo '{"dependencies":{"next":"14.0.0"}}' >"$project/package.json"
  out="$(hostdime_tsx "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/profiles/ts/detect-stack.ts" "$project")"
  assert "detect next" test "$out" = "next"

  project2="$(hostdime_make_project)-py"
  mkdir -p "$project2/.git"
  touch "$project2/pyproject.toml"
  out2="$(hostdime_tsx "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/profiles/ts/detect-stack.ts" "$project2")"
  assert "detect python" test "$out2" = "python"

  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/bootstrap-project.sh" \
    --profile=next "$project" >/dev/null
  assert "next SKILLS-ROUTING" test -f "$project/.cursor/SKILLS-ROUTING.md"
  assert "next-project.mdc" test -f "$project/.cursor/rules/next-project.mdc"

  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/profiles/sh/profiles.sh"
  list="$(profiles_list)"
  assert "profiles_list next" grep -q next <<<"$list"
  assert "profiles_list python" grep -q python <<<"$list"
  assert "profiles_list zend-laminas" grep -q zend-laminas <<<"$list"
}

test_onboard_noninteractive() {
  project="$(hostdime_make_project)"
  echo '{"dependencies":{"next":"14.0.0"}}' >"$project/package.json"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/onboard.sh" \
    --project="$project" \
    --profile=next \
    --yes \
    --no-code-review \
    --skip-extras >/dev/null
  assert "onboard next rule" test -f "$project/.cursor/rules/next-project.mdc"
  assert "onboard registry" grep -qF "$project" "$CURSOR_USER_DIR/hostdime-ia/projects.json"
}

test_memoria_init_backup_restore() {
  project="$(hostdime_make_project)"
  export HOSTDIME_REVIEW_WORKDIR
  HOSTDIME_REVIEW_WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/hd-rev.XXXXXX")"
  hostdime_tsx "$ROOT/packages/code-review/bin/review-memoria.ts" init --write "$project" >/dev/null
  assert "memoria version" test -f "$HOSTDIME_REVIEW_WORKDIR/.memoria-version"
  assert "context yaml" test -f "$HOSTDIME_REVIEW_WORKDIR/context.yaml"
  assert "decisions jsonl" test -f "$HOSTDIME_REVIEW_WORKDIR/decisions.jsonl"
  assert "convencoes" test -f "$HOSTDIME_REVIEW_WORKDIR/convencoes.md"
  assert "sem pasta no projeto" test ! -d "$project/.cursor/review"
  hostdime_tsx "$ROOT/packages/code-review/bin/review-memoria.ts" backup "$project" >/dev/null
  assert "backup latest context" test -f "$HOSTDIME_REVIEW_WORKDIR/backups/latest/context.yaml"
  hostdime_tsx "$ROOT/packages/code-review/bin/review-memoria.ts" restore --write "$project" >/dev/null
  assert "restore version" test -f "$HOSTDIME_REVIEW_WORKDIR/.memoria-version"
  assert "restore context" test -f "$HOSTDIME_REVIEW_WORKDIR/context.yaml"
}

test_health_multi_project() {
  project="$(hostdime_make_project)"
  bash "$HOSTDIME_IA_ROOT/packages/cursor/scripts/sh/bootstrap-project.sh" \
    --profile=python "$project" >/dev/null

  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/sh/health-check.sh"
  out="$(health_check_project "$project" 2>&1 || true)"
  assert "health python label" grep -q 'perfil: python' <<<"$out"
  assert "health rules ok" grep -q 'rules do projeto ok' <<<"$out"

  label="$(health_detect_profile_label "$project")"
  assert "health_detect_profile_label" test "$label" = "python"
}

test_review_diff_and_ci_empty() {
  project="$(hostdime_make_git_project)"
  printf 'readme\n' >"$project/README.md"
  git -C "$project" add README.md
  git -C "$project" commit -q -m "init non-reviewable"

  export CURSOR_PROJECT_DIR="$project"
  mapfile -t files < <(
    bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-diff.sh" HEAD 2>/dev/null || true
  )
  assert "diff vazio em HEAD" test "${#files[@]}" -eq 0

  out="$(
    HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" \
      bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-ci.sh" HEAD 2>&1
  )"
  status=$?
  assert "review-ci exit 0 sem arquivos" test "$status" -eq 0
  assert "review-ci mensagem vazio" grep -q 'Nenhum arquivo revisável' <<<"$out"
}

test_review_diff_and_ci_with_file() {
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
  diff_out="$(
    bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-diff.sh" HEAD~1 2>/dev/null
  )"
  assert "diff lista ok.mjs" grep -qx 'src/ok.mjs' <<<"$diff_out"

  out="$(
    HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" \
      bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-ci.sh" HEAD~1 2>&1
  )"
  status=$?
  assert "review-ci com arquivo limpo" test "$status" -eq 0
  assert "review-ci OK summary" grep -q 'CI review: OK' <<<"$out"
}

test_check_inbox_clean_js() {
  project="$(hostdime_make_git_project)"
  hostdime_mock_semgrep
  mkdir -p "$project/src"
  cp "$HOSTDIME_IA_ROOT/tests/fixtures/review/sample-ok.mjs" "$project/src/ok.mjs"
  export CURSOR_PROJECT_DIR="$project"

  out="$(
    HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" \
      REVIEW_CHECK_CI=1 \
      bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/check-inbox.sh" "$project/src/ok.mjs" 2>&1
  )"
  status=$?
  assert "check-inbox exit 0" test "$status" -eq 0
  assert "check-inbox fim" grep -q 'Fim' <<<"$out"
}

test_export_exclusions() {
  project="$(hostdime_make_git_project)"
  export HOSTDIME_REVIEW_WORKDIR
  HOSTDIME_REVIEW_WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/hd-rev.XXXXXX")"
  mkdir -p "$HOSTDIME_REVIEW_WORKDIR"
  cp "$HOSTDIME_IA_ROOT/tests/fixtures/review/context.yaml" \
    "$HOSTDIME_REVIEW_WORKDIR/context.yaml"

  out="$(
    bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-export-exclusions.sh" "$project" 2>&1
  )"
  status=$?
  assert "export exit 0" test "$status" -eq 0
  assert "export file" test -f "$HOSTDIME_REVIEW_WORKDIR/exclusions.yaml"
  assert "export count 2" grep -q '2 exclus' <<<"$out"
  assert "export rejeitado" grep -q 'accepted-repo-pattern' "$HOSTDIME_REVIEW_WORKDIR/exclusions.yaml"
  assert "sem pasta no projeto" test ! -d "$project/.cursor/review"
  if grep -q 'still-pending' "$HOSTDIME_REVIEW_WORKDIR/exclusions.yaml"; then
    assert "export nao inclui aceito" false
  else
    assert "export nao inclui aceito" true
  fi
}

test_smoke_ingest() {
  out="$(hostdime_tsx "$HOSTDIME_IA_ROOT/tests/smoke_review_ingest.ts" 2>&1)"
  status=$?
  assert "ingest smoke exit 0" test "$status" -eq 0
  assert "ingest smoke ok" grep -q 'smoke_review_ingest: OK' <<<"$out"
}

test_lint_ts() {
  out="$(bash "$HOSTDIME_IA_ROOT/tests/lint-ts.sh" 2>&1)"
  status=$?
  assert "lint ts exit 0" test "$status" -eq 0
  assert "lint ts ok" grep -q 'tsc: OK' <<<"$out"
}

test_pre_commit_skip_and_clean() {
  project="$(hostdime_make_git_project)"
  hostdime_mock_semgrep
  printf 'init\n' >"$project/README.md"
  git -C "$project" add README.md
  git -C "$project" commit -q -m "init"

  out="$(
    cd "$project" && HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" HOSTDIME_SKIP_PRE_COMMIT=1 \
      bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-pre-commit.sh" 2>&1
  )"
  st=$?
  assert "pre-commit skip env" test "$st" -eq 0
  assert "pre-commit skip msg" grep -q 'skip' <<<"$out"

  out="$(
    cd "$project" && HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" \
      bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-pre-commit.sh" 2>&1
  )"
  st=$?
  assert "pre-commit sem stage" test "$st" -eq 0
  assert "pre-commit nada no stage" grep -q 'nada no stage' <<<"$out"

  mkdir -p "$project/src"
  cp "$HOSTDIME_IA_ROOT/tests/fixtures/review/sample-ok.mjs" "$project/src/ok.mjs"
  git -C "$project" add src/ok.mjs
  out="$(
    cd "$project" && HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" \
      bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-pre-commit.sh" 2>&1
  )"
  st=$?
  assert "pre-commit clean js" test "$st" -eq 0
  assert "pre-commit OK" grep -q 'pre-commit: OK' <<<"$out"
}

test_install_pre_commit_hook() {
  project="$(hostdime_make_git_project)"
  printf 'x\n' >"$project/README.md"
  git -C "$project" add README.md
  git -C "$project" commit -q -m "init"

  out="$(
    HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" \
      bash "$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/install-pre-commit.sh" "$project" 2>&1
  )"
  st=$?
  git_dir="$(git -C "$project" rev-parse --git-dir)"
  [[ "$git_dir" != /* ]] && git_dir="$project/$git_dir"
  assert "install exit 0" test "$st" -eq 0
  assert "hook exists" test -x "$git_dir/hooks/pre-commit"
  assert "hook marker" grep -q 'hostdime-ia pre-commit' "$git_dir/hooks/pre-commit"
  assert "install msg" grep -q 'pre-commit instalado' <<<"$out"
}

echo "HostDime IA — testes (runner embutido)"

run_test "link symlinks" test_link_symlinks
run_test "link remove orquestrador do projeto" test_link_removes_project_orchestrator
run_test "link remove command do projeto" test_link_removes_project_command
run_test "link preserva real" test_link_preserves_real
run_test "link preserva command real" test_link_preserves_real_command
run_test "gitignore scrub orphans" test_gitignore_scrub_orphans
run_test "bootstrap profile" test_bootstrap_profile
run_test "bootstrap invalid" test_bootstrap_invalid_profile
run_test "detach" test_detach
run_test "detach registry" test_detach_registry
run_test "merge hooks" test_merge_hooks
run_test "hubspot mcp install" test_hubspot_mcp_install
run_test "hubspot mcp detect" test_hubspot_mcp_detect
run_test "finalizar repo" test_finalizar_repo
run_test "boot sync toggle" test_boot_sync_toggle
run_test "boot sync unset" test_boot_sync_unset
run_test "boot sync prompt skip" test_boot_sync_prompt_skip
run_test "historico validate" test_historico_validate
run_test "historico validate invalid" test_historico_validate_invalid
run_test "historico scope match" test_historico_scope_match
run_test "historico merge hooks" test_historico_merge_hooks
run_test "historico templates" test_historico_templates
run_test "historico pending catchup" test_historico_pending_catchup
run_test "cursor cli merge config" test_cursor_cli_merge_config
run_test "cursor cli dry run" test_cursor_cli_dry_run
run_test "agent wrapper dry run" test_agent_wrapper_dry_run
run_test "sync-inbox scan" test_sync_inbox_scan
run_test "profiles detect bootstrap" test_profiles_detect_and_bootstrap
run_test "onboard noninteractive" test_onboard_noninteractive
run_test "health multi-project" test_health_multi_project
run_test "memoria init backup restore" test_memoria_init_backup_restore
run_test "review-diff/ci empty" test_review_diff_and_ci_empty
run_test "review-diff/ci with file" test_review_diff_and_ci_with_file
run_test "check-inbox clean js" test_check_inbox_clean_js
run_test "export exclusions" test_export_exclusions
run_test "smoke ingest" test_smoke_ingest
run_test "lint ts" test_lint_ts
run_test "pre-commit skip and clean" test_pre_commit_skip_and_clean
run_test "install pre-commit hook" test_install_pre_commit_hook

echo ""
echo "Resumo: $pass ok, $fail falha(s)"
test "$fail" -eq 0
