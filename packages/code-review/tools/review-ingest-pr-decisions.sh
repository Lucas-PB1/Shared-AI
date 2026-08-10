#!/usr/bin/env bash
# Ingere decisões de um PR mergeado (comentários /avaliar) → memória v2.
# Uso: PR_NUMBER=49 review-ingest-pr-decisions.sh [--write] [project-dir]
set -euo pipefail

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_tsx.sh
source "$TOOLS_DIR/_tsx.sh"

PROJECT="."
WRITE=""

for arg in "$@"; do
  case "$arg" in
    --write) WRITE="--write" ;;
    *) PROJECT="$arg" ;;
  esac
done

PR_NUMBER="${PR_NUMBER:-${GITHUB_EVENT_PULL_REQUEST_NUMBER:-}}"
if [[ -z "$PR_NUMBER" ]]; then
  echo "Erro: defina PR_NUMBER." >&2
  exit 1
fi

REPO="${GITHUB_REPOSITORY:-}"
if [[ -z "$REPO" ]]; then
  REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
fi

ARGS=(
  "$HOSTDIME_TSX"
  "$HOSTDIME_IA_ROOT/packages/code-review/bin/review-ingest-pr-decisions.ts"
  "$PR_NUMBER"
  --project
  "$PROJECT"
)
[[ -n "$REPO" ]] && ARGS+=(--repo "$REPO")
[[ -n "$WRITE" ]] && ARGS+=("$WRITE")
[[ "${REVIEW_INGEST_PROMOTE_ALL:-}" == "1" ]] && ARGS+=(--all)

exec "${ARGS[@]}"
