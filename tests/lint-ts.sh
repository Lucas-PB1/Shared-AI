#!/usr/bin/env bash
# tsc --noEmit (TypeScript + @types/node).
# Uso: npm run lint:ts
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TSC="${ROOT}/node_modules/.bin/tsc"
if [[ ! -x "$TSC" ]]; then
  echo "Erro: typescript/tsc não encontrado (npm install na raiz)." >&2
  exit 1
fi

echo "tsc --noEmit — tooling (tsconfig.tooling.json)"
"$TSC" -p tsconfig.tooling.json --noEmit
echo "tsc: OK"
