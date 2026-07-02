#!/usr/bin/env bash
# Instala e configura Cursor CLI (agent) com approvalMode unrestricted (modo auto).
# Uso: install-cursor-cli.sh [install|configure|status|login] [--dry-run]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"

if [[ -f "$SCRIPT_DIR/lib/cursor-cli.sh" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/lib/cursor-cli.sh"
elif [[ -f "$CURSOR_DIR/hostdime-cursor-cli.sh" ]]; then
  # shellcheck disable=SC1091
  source "$CURSOR_DIR/hostdime-cursor-cli.sh"
else
  echo "Erro: lib cursor-cli.sh não encontrada" >&2
  exit 1
fi

action=install
dry_run=0
skip_login=0
for arg in "$@"; do
  case "$arg" in
    install | configure | status | login) action="$arg" ;;
    --dry-run) dry_run=1 ;;
    --skip-login) skip_login=1 ;;
    --help | -h)
      cat <<'EOF'
Uso: install-cursor-cli.sh [install|configure|status|login] [--dry-run]

  install    Instala agent (se ausente) + configura modo auto (default)
  configure  Só merge cli-config.json (approvalMode=unrestricted)
  status     Versão, auth e approvalMode
  login      agent login (browser)
EOF
      exit 0
      ;;
  esac
done

case "$action" in
  install)
    cursor_cli_install_and_configure "$dry_run" "$skip_login"
    ;;
  configure)
    if [[ "$dry_run" -eq 1 ]]; then
      echo "dry-run: configure auto"
      exit 0
    fi
    cursor_cli_configure_auto
    cursor_cli_ensure_path_profile
    ;;
  status)
    cursor_cli_status_report
    ;;
  login)
    cursor_cli_login
    ;;
esac
