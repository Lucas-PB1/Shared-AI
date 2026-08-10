#!/usr/bin/env bash
# Puxa exclusions/conventions do store (store-first; opcional grava workdir se HOSTDIME_REVIEW_DISK_CACHE=1).
set -euo pipefail
# shellcheck source=./_tsx.sh
source "$(cd "$(dirname "$0")" && pwd)/_tsx.sh"
hostdime_run_tsx "$HOSTDIME_IA_ROOT/packages/code-review/bin/review-memory-pull.ts" "$@"
