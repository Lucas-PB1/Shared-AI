#!/usr/bin/env bash
# Runner de testes — usa bats se disponível; senão runner embutido.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v bats >/dev/null 2>&1; then
  exec bats tests/
fi

if [[ -x "$ROOT/vendor/bats/bin/bats" ]]; then
  exec "$ROOT/vendor/bats/bin/bats" tests/
fi

# shellcheck disable=SC1091
source "$ROOT/tests/run-embedded.sh"
