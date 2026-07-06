#!/usr/bin/env bash
# Wrapper: memória de review v2
set -euo pipefail

ROOT="${HOSTDIME_IA_ROOT:-$(cd "$(dirname "$0")/../../.." && pwd)}"
exec python3 "$ROOT/packages/code-review/tools/review-memoria.py" "$@"
