#!/usr/bin/env bash
# Sync inbox — scan projetos sync + abrir no Cursor.
# Uso: npm run sync-inbox -- on|off|status|run|scan
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/sync-inbox.sh"

action="${1:-status}"
shift || true

case "$action" in
  on | enable)
    sync_inbox_enable
    ;;
  off | disable)
    sync_inbox_disable
    ;;
  status)
    sync_inbox_status
    ;;
  run)
    sync_inbox_run
    ;;
  scan)
    sync_inbox_scan
    sync_inbox_format_report
    ;;
  -h | --help | help)
    cat <<'EOF'
Uso: npm run sync-inbox -- [on|off|status|run|scan]

  on      Liga scan + menu ao iniciar sessão
  off     Desliga
  status  Estado + inbox atual
  run     Scan agora + menu interativo
  scan    Só scan (gera sync-inbox.json)
EOF
    ;;
  *)
    echo "Ação desconhecida: $action" >&2
    exit 1
    ;;
esac
