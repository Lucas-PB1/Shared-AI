#!/usr/bin/env bash
# CLI auxiliar do /historico — validate, status, merge-hooks, scope-match.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB="$SCRIPT_DIR/lib/history-watch-match.py"
MERGE="$SCRIPT_DIR/lib/merge-historico-hooks.py"

usage() {
  cat <<'EOF'
Uso: historico-cli.sh <comando> [args...]

Comandos:
  status [projeto]              Lista watches
  validate [projeto]            Valida watches.json
  merge-hooks [projeto]         Merge hook stop em .cursor/hooks.json
  scope-match <arquivo> [proj]  Testa match de escopo
EOF
}

cmd="${1:-}"
shift || true

project="${1:-.}"
if [[ "$cmd" == "scope-match" ]]; then
  file="${1:?Informe o arquivo}"
  project="${2:-.}"
  python3 "$LIB" scope-match "$(cd "$project" && pwd)" "$file"
  exit $?
fi

project="$(cd "$project" && pwd)"

case "$cmd" in
  status)
    python3 "$LIB" status "$project"
    ;;
  validate)
    python3 "$LIB" validate "$project"
    ;;
  merge-hooks)
    python3 "$MERGE" "$project/.cursor/hooks.json" "$project"
    ;;
  -h | --help | help | '')
    usage
    ;;
  *)
    echo "Comando desconhecido: $cmd" >&2
    usage >&2
    exit 1
    ;;
esac
