#!/usr/bin/env bash
# Liga/desliga sync automático ao iniciar o computador.
# Uso: npm run boot-sync -- on|off|status|run
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/boot-sync.sh"

ACTION="${1:-status}"

case "$ACTION" in
  on | enable)
    boot_sync_enable
    ;;
  off | disable)
    boot_sync_disable
    ;;
  status)
    boot_sync_status
    ;;
  run)
    boot_sync_run
    ;;
  -h | --help)
    cat <<'EOF'
Uso: npm run boot-sync -- [on|off|status|run]

  on       Liga git pull + sync ao iniciar sessão
  off      Desliga e remove agendamento
  status   Mostra estado atual (default)
  run      Executa manualmente (como no boot)

Na primeira npm run sync interativa, pergunta se deseja ativar.
EOF
    ;;
  *)
    echo "Ação desconhecida: $ACTION" >&2
    echo "Use: on | off | status | run" >&2
    exit 1
    ;;
esac
