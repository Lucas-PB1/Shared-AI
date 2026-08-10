#!/usr/bin/env bash
# Estado e instalação do MCP HubSpot (HubSpotDev) em ~/.cursor/mcp.json

# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]}")/hostdime-env.sh"

hubspot_mcp_ts() {
  local root
  root="$(hostdime_resolve_root 2>/dev/null || true)"
  if [[ -n "$root" && -f "$root/packages/cursor/scripts/lib/hubspot-mcp.ts" ]]; then
    printf '%s/packages/cursor/scripts/lib/hubspot-mcp.ts' "$root"
    return 0
  fi
  return 1
}

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
  local mcp_file="$1" ts
  [[ -f "$mcp_file" ]] || return 1
  ts="$(hubspot_mcp_ts)" || return 1
  hostdime_tsx "$ts" configured "$mcp_file"
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
  local mcp_file="$1" ts
  ts="$(hubspot_mcp_ts)" || {
    echo "Erro: hubspot-mcp.ts não encontrado" >&2
    return 1
  }
  hostdime_tsx "$ts" merge "$mcp_file"
}

hubspot_mcp_install() {
  local mcp_file
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
