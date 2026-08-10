#!/usr/bin/env bash
# Unit tests do code-review (Python + Node), sem rede.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

py_tests=(
  packages/code-review/tools/tests/test_ingest_and_ids.py
  packages/code-review/tools/tests/test_pr_report.py
  packages/code-review/tools/tests/test_memoria_core.py
)

node_tests=(
  packages/code-review/tools/tests/test_skill_routing.mjs
  packages/code-review/tools/tests/test_llm_helpers.mjs
)

for t in "${py_tests[@]}"; do
  echo "=== python3 $t ==="
  python3 "$t"
done

for t in "${node_tests[@]}"; do
  echo "=== node --test $t ==="
  node --test "$t"
done

echo "test:review-unit: OK"
