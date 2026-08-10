#!/usr/bin/env bash
# Exporta exclusions versionáveis a partir de context.yaml local.
set -euo pipefail
# shellcheck source=./_tsx.sh
source "$(cd "$(dirname "$0")" && pwd)/_tsx.sh"
hostdime_run_tsx "$HOSTDIME_IA_ROOT/packages/code-review/bin/review-export-exclusions.ts" "${1:-.}"
