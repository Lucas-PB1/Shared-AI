#!/usr/bin/env bash
# Publica review_run + findings no store (U2). Soft se SUPABASE_* ausente.
set -euo pipefail
# shellcheck source=./_tsx.sh
source "$(cd "$(dirname "$0")" && pwd)/_tsx.sh"
hostdime_run_tsx "$HOSTDIME_IA_ROOT/packages/code-review/bin/review-store-publish.ts" "$@"
