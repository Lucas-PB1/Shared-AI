#!/usr/bin/env bash
# CLI auxiliar do /historico — validate, status, merge-hooks, scope-match, pending, catch-up.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB="$SCRIPT_DIR/lib/history-watch-match.py"
MERGE="$SCRIPT_DIR/lib/merge-historico-hooks.py"

usage() {
  cat <<'EOF'
Uso: historico-cli.sh <comando> [args...]

Comandos:
  status [projeto]                    Lista watches
  validate [projeto]                  Valida watches.json
  merge-hooks [projeto]               Merge hook stop em .cursor/hooks.json
  scope-match <arquivo> [proj]        Testa match de escopo
  pending [projeto] [--json] [--check] [--base=HEAD]
                                      Arquivos alterados no escopo sem log recente
  catch-up [projeto] [--json] [--base=HEAD]
                                      Detecta pendências + rascunhos para append manual
  draft <watch-id> [projeto] [--json] [--base=HEAD]
                                      Rascunho de entrada para um watch
EOF
}

cmd="${1:-}"
shift || true

extra_args=()
project="."

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json | --check | --base=*)
      extra_args+=("$1")
      shift
      ;;
    --base)
      extra_args+=("$1" "${2:?Informe a base git}")
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      if [[ "$cmd" == "scope-match" && -z "${scope_file:-}" ]]; then
        scope_file="$1"
      elif [[ "$cmd" == "draft" && -z "${watch_id:-}" ]]; then
        watch_id="$1"
      else
        project="$1"
      fi
      shift
      ;;
  esac
done

case "$cmd" in
  scope-match)
    scope_file="${scope_file:?Informe o arquivo}"
    project="$(cd "$project" && pwd)"
    python3 "$LIB" scope-match "$project" "$scope_file"
    ;;
  pending)
    project="$(cd "$project" && pwd)"
    python3 "$LIB" pending "${extra_args[@]}" "$project"
    ;;
  catch-up)
    project="$(cd "$project" && pwd)"
    python3 "$LIB" catch-up "${extra_args[@]}" "$project"
    ;;
  draft)
    watch_id="${watch_id:?Informe o id do watch}"
    project="$(cd "$project" && pwd)"
    python3 "$LIB" draft "$watch_id" "${extra_args[@]}" "$project"
    ;;
  status | validate | merge-hooks)
    project="$(cd "$project" && pwd)"
    case "$cmd" in
      status) python3 "$LIB" status "$project" ;;
      validate) python3 "$LIB" validate "$project" ;;
      merge-hooks) python3 "$MERGE" "$project/.cursor/hooks.json" "$project" ;;
    esac
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
