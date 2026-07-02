#!/usr/bin/env bash
# Estado e instalação do MCP HubSpot (HubSpotDev) em ~/.cursor/mcp.json

hubspot_mcp_state_file() {
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  printf '%s/hostdime-hubspot-mcp.state' "$cursor_dir"
}

hubspot_mcp_cursor_config() {
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  printf '%s/mcp.json' "$cursor_dir"
}

hubspot_mcp_read_status() {
  local state_file
  state_file="$(hubspot_mcp_state_file)"
  [[ -f "$state_file" ]] || return 0
  # shellcheck disable=SC1090
  source "$state_file"
  printf '%s' "${STATUS:-}"
}

hubspot_mcp_write_status() {
  local status="$1"
  local state_file cursor_dir
  cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  state_file="$(hubspot_mcp_state_file)"
  mkdir -p "$cursor_dir"
  printf 'STATUS=%s\n' "$status" >"$state_file"
}

hubspot_mcp_is_configured() {
  local mcp_file="$1"
  [[ -f "$mcp_file" ]] || return 1
  python3 - "$mcp_file" <<'PY'
import json
import sys

path = sys.argv[1]
try:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
except (OSError, json.JSONDecodeError):
    sys.exit(1)

servers = data.get("mcpServers") or {}
for key in servers:
    if key.lower() in {"hubspotdev", "hubspot"}:
        sys.exit(0)
sys.exit(1)
PY
}

hubspot_mcp_installed() {
  local project_mcp="${1:-}"
  local cursor_mcp
  cursor_mcp="$(hubspot_mcp_cursor_config)"
  hubspot_mcp_is_configured "$cursor_mcp" && return 0
  if [[ -n "$project_mcp" && -f "$project_mcp" ]]; then
    hubspot_mcp_is_configured "$project_mcp"
    return $?
  fi
  return 1
}

hubspot_mcp_merge_config() {
  local mcp_file="$1"
  python3 - "$mcp_file" <<'PY'
import json
import os
import sys

path = sys.argv[1]
entry = {
    "HubSpotDev": {
        "command": "npx",
        "args": [
            "-y",
            "-p",
            "@hubspot/cli",
            "hs",
            "mcp",
            "start",
            "--ai-agent",
            "cursor",
        ],
        "env": {"HUBSPOT_MCP_STANDALONE": "true"},
    }
}

data = {"mcpServers": {}}
if os.path.isfile(path):
    with open(path, encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as exc:
            print(f"Erro: {path} não é JSON válido ({exc})", file=sys.stderr)
            sys.exit(1)

servers = data.setdefault("mcpServers", {})
for key in list(servers):
    if key.lower() in {"hubspotdev", "hubspot"}:
        del servers[key]
servers.update(entry)

os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY
}

hubspot_mcp_install() {
  local mcp_file changed=0
  mcp_file="$(hubspot_mcp_cursor_config)"
  if hubspot_mcp_installed; then
    hubspot_mcp_write_status "installed"
    echo "MCP HubSpotDev já configurado em $mcp_file"
    return 0
  fi
  hubspot_mcp_merge_config "$mcp_file"
  hubspot_mcp_write_status "installed"
  echo "MCP HubSpotDev adicionado em $mcp_file"
  echo "Reinicie o Cursor (Settings → Tools & MCP) para ativar o servidor."
}

hubspot_mcp_decline() {
  hubspot_mcp_write_status "declined"
  echo "Preferência salva: não sugerir instalação do MCP HubSpot automaticamente."
  echo "Para instalar depois: /hubspot-mcp"
}

hubspot_mcp_mark_installed() {
  hubspot_mcp_write_status "installed"
}
