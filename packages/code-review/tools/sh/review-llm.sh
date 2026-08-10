#!/usr/bin/env bash
# /avaliar LLM — gera relatório no formato do command /avaliar.
# Uso: REVIEW_LLM_API_KEY=... bash review-llm.sh --project PATH --file REL_PATH [...]
set -euo pipefail
# shellcheck source=./_tsx.sh
source "$(cd "$(dirname "$0")" && pwd)/_tsx.sh"
hostdime_run_tsx "$HOSTDIME_IA_ROOT/packages/code-review/bin/review-llm.ts" "$@"
