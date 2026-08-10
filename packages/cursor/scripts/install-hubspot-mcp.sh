#!/usr/bin/env bash
# Instala ou registra preferência do MCP HubSpot (HubSpotDev).
# Uso: install-hubspot-mcp.sh [--decline|--mark-installed]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/hubspot/hubspot-mcp.sh"

action=install
for arg in "$@"; do
  case "$arg" in
    --decline) action=decline ;;
    --mark-installed) action=mark ;;
    --help|-h)
      echo "Uso: install-hubspot-mcp.sh [--decline|--mark-installed]"
      exit 0
      ;;
  esac
done

case "$action" in
  decline)
    hubspot_mcp_decline
    ;;
  mark)
    hubspot_mcp_mark_installed
    ;;
  install)
    hubspot_mcp_install
    ;;
esac
