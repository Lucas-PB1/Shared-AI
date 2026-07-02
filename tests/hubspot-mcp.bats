#!/usr/bin/env bash
load helpers

setup() {
  hostdime_test_setup
  # shellcheck disable=SC1091
  source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/hubspot-mcp.sh"
}

teardown() {
  hostdime_test_teardown
}

@test "install-hubspot-mcp adiciona HubSpotDev ao mcp.json" {
  mcp_file="$CURSOR_USER_DIR/mcp.json"
  printf '{"mcpServers":{"other":{"command":"echo"}}}\n' >"$mcp_file"

  "$HOSTDIME_IA_ROOT/packages/cursor/scripts/install-hubspot-mcp.sh"

  [[ -f "$mcp_file" ]]
  grep -q HubSpotDev "$mcp_file"
  grep -q other "$mcp_file"
  [[ "$(hubspot_mcp_read_status)" == "installed" ]]
}

@test "install-hubspot-mcp --decline grava preferência" {
  "$HOSTDIME_IA_ROOT/packages/cursor/scripts/install-hubspot-mcp.sh" --decline
  [[ "$(hubspot_mcp_read_status)" == "declined" ]]
}

@test "hubspot_mcp_installed detecta servidor configurado" {
  mcp_file="$CURSOR_USER_DIR/mcp.json"
  printf '{"mcpServers":{"HubSpotDev":{"command":"npx"}}}\n' >"$mcp_file"
  hubspot_mcp_installed
}

@test "link-project inclui command hubspot-mcp" {
  project="$(hostdime_make_project)"
  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"
  [[ -L "$project/.cursor/commands/hubspot-mcp.md" ]]
}

@test "link-project inclui rule skills-orchestrator-hubspot" {
  project="$(hostdime_make_project)"
  "$CURSOR_LINK_PROJECT_SCRIPT" --quiet "$project"
  [[ -L "$project/.cursor/rules/skills-orchestrator-hubspot.mdc" ]]
}
