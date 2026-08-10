#!/usr/bin/env bash
# Unit tests do code-review (TypeScript — sem Python).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TSX="${ROOT}/node_modules/.bin/tsx"
if [[ ! -x "$TSX" ]]; then
  echo "Erro: tsx não encontrado (npm install na raiz)." >&2
  exit 1
fi

ts_tests=(
  packages/code-review/tests/ingest/finding-ids-and-ingest.test.ts
  packages/code-review/tests/report/pr-report.test.ts
  packages/code-review/tests/memory/merge.test.ts
  packages/code-review/tests/store/store.test.ts
  packages/code-review/tests/skill-routing/skill-routing.test.ts
  packages/code-review/tests/llm/llm-helpers.test.ts
)

for t in "${ts_tests[@]}"; do
  echo "=== tsx --test $t ==="
  "$TSX" --test "$t"
done

echo "test:review-unit: OK"
