#!/usr/bin/env bash
# Liga/desliga sync automático ao iniciar o computador.
# Uso: npm run boot-sync -- on|check|off|status|run
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/boot-sync.sh"

ACTION="${1:-status}"

case "$ACTION" in
  on | enable)
    boot_sync_enable
    ;;
  check)
    boot_sync_enable_check
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
Uso: npm run boot-sync -- [on|check|off|status|run]

  on       Liga git pull + sync ao iniciar sessão (executa o código novo do clone)
  check    Só git fetch ao iniciar sessão; registra commits pendentes no log
  off      Desliga e remove agendamento
  status   Mostra estado atual (default)
  run      Executa manualmente (como no boot)

Na primeira npm run sync interativa, pergunta se deseja ativar.
EOF
    ;;
  *)
    echo "Ação desconhecida: $ACTION" >&2
    echo "Use: on | check | off | status | run" >&2
    exit 1
    ;;
esac
