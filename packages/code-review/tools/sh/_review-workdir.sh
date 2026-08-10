#!/usr/bin/env bash
# Workdir de review fora do projeto (= reviewWorkDir em TS).
# Uso: source _review-workdir.sh && hostdime_review_workdir /path/projeto

hostdime_review_workdir() {
  local project="${1:-.}"
  if [[ -n "${HOSTDIME_REVIEW_WORKDIR:-}" ]]; then
    # shellcheck disable=SC2164
    (cd "$HOSTDIME_REVIEW_WORKDIR" 2>/dev/null && pwd) || printf '%s' "$HOSTDIME_REVIEW_WORKDIR"
    return 0
  fi
  local abs
  abs="$(cd "$project" 2>/dev/null && pwd -P)" || abs="$project"
  local h
  if command -v sha256sum >/dev/null 2>&1; then
    h="$(printf '%s' "$abs" | sha256sum | awk '{print substr($1,1,16)}')"
  else
    h="$(printf '%s' "$abs" | shasum -a 256 | awk '{print substr($1,1,16)}')"
  fi
  printf '%s' "${TMPDIR:-/tmp}/hostdime-review/${h}"
}
