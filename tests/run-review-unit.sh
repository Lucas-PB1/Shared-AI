#!/usr/bin/env bash
# Unit tests do code-review (TypeScript / node — sem Python).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TSX="${ROOT}/node_modules/.bin/tsx"
if [[ ! -x "$TSX" ]]; then
  echo "Erro: tsx não encontrado (npm install na raiz)." >&2
  exit 1
fi

ts_tests=(
  packages/code-review/tests/finding-ids-and-ingest.test.ts
  packages/code-review/tests/pr-report.test.ts
  packages/code-review/tests/memoria-core.test.ts
  packages/code-review/tests/store.test.ts
)

node_tests=(
  packages/code-review/tools/tests/test_skill_routing.mjs
  packages/code-review/tools/tests/test_llm_helpers.mjs
)

for t in "${ts_tests[@]}"; do
  echo "=== tsx --test $t ==="
  "$TSX" --test "$t"
done

for t in "${node_tests[@]}"; do
  echo "=== node --test $t ==="
  node --test "$t"
done

echo "test:review-unit: OK"
