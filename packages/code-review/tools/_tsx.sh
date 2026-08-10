#!/usr/bin/env bash
# Resolve monorepo root + tsx; source nos wrappers code-review.
# Uso: source .../tools/_tsx.sh  → HOSTDIME_TSX, HOSTDIME_IA_ROOT

_code_review_tools_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOSTDIME_IA_ROOT="${HOSTDIME_IA_ROOT:-$(cd "$_code_review_tools_dir/../../.." && pwd)}"
HOSTDIME_TSX="${HOSTDIME_IA_ROOT}/node_modules/.bin/tsx"

if [[ ! -x "$HOSTDIME_TSX" && ! -f "$HOSTDIME_TSX" ]]; then
  echo "Erro: tsx não encontrado em $HOSTDIME_TSX (npm install na raiz)." >&2
  return 1 2>/dev/null || exit 1
fi

hostdime_run_tsx() {
  exec "$HOSTDIME_TSX" "$@"
}
