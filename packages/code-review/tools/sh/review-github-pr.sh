#!/usr/bin/env bash
# /avaliar automático no GitHub — estático + LLM + comentários por arquivo.
# Uso (CI): PR_NUMBER=42 REVIEW_DIFF_BASE=<base-sha> HEAD_SHA=<head-sha> review-github-pr.sh
#
# Módulos: tools/sh/github-pr/*.sh (soft ≤200 linhas cada).
set -euo pipefail

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_ROOT="$(cd "$TOOLS_DIR/../.." && pwd)"
GH_PR_LIB="$TOOLS_DIR/github-pr"
# shellcheck source=./_tsx.sh
source "$TOOLS_DIR/_tsx.sh"
PR_REPORT_TS="$PKG_ROOT/bin/review-pr-report.ts"

# shellcheck source=./github-pr/common.sh
source "$GH_PR_LIB/common.sh"
# shellcheck source=./github-pr/state.sh
source "$GH_PR_LIB/state.sh"
# shellcheck source=./github-pr/report.sh
source "$GH_PR_LIB/report.sh"
# shellcheck source=./github-pr/inline-suggestion.sh
source "$GH_PR_LIB/inline-suggestion.sh"
# shellcheck source=./github-pr/inline-post.sh
source "$GH_PR_LIB/inline-post.sh"
# shellcheck source=./github-pr/summary.sh
source "$GH_PR_LIB/summary.sh"

main() {
  require_cmd gh
  require_cmd jq
  require_cmd git
  require_cmd node

  HOSTDIME_IA_ROOT="$(resolve_hostdime_ia_root)"
  PROJECT="$(resolve_project)"
  export CURSOR_PROJECT_DIR="$PROJECT"
  export HOSTDIME_IA_ROOT

  PR_NUMBER="${PR_NUMBER:-${GITHUB_EVENT_PULL_REQUEST_NUMBER:-}}"
  GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-}"

  if [[ -z "$PR_NUMBER" ]]; then
    echo "Erro: defina PR_NUMBER." >&2
    exit 1
  fi
  if [[ -z "$GITHUB_REPOSITORY" ]]; then
    GITHUB_REPOSITORY="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
  fi
  if [[ -z "$GITHUB_REPOSITORY" ]]; then
    echo "Erro: defina GITHUB_REPOSITORY." >&2
    exit 1
  fi

  export GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
  if [[ -z "$GH_TOKEN" ]]; then
    echo "Erro: GH_TOKEN ou GITHUB_TOKEN necessário." >&2
    exit 1
  fi

  cd "$PROJECT"

  local llm_mode="estático"
  if llm_enabled; then
    if [[ -n "${CURSOR_API_KEY:-}" ]] || [[ "${REVIEW_LLM_PROVIDER:-}" == "cursor" ]]; then
      llm_mode="estático + Cursor (/avaliar)"
    else
      llm_mode="estático + LLM (/avaliar)"
    fi
  fi

  local base_arg="${REVIEW_DIFF_BASE:-}"
  mapfile -t files < <("$TOOLS_DIR/review-diff.sh" "$base_arg" 2>/dev/null)

  state_load

  local reviewed=0 skipped=0 failed=0
  local file blob_sha prev_sha stack verdict static_output check_status
  local tmp_dir report_file report_body origin inline_count

  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  SUMMARY_FILES_LOG="$tmp_dir/summary-files.tsv"
  SUMMARY_INLINE_LOG="$tmp_dir/summary-inline.tsv"
  : >"$SUMMARY_FILES_LOG"
  : >"$SUMMARY_INLINE_LOG"
  export SUMMARY_FILES_LOG SUMMARY_INLINE_LOG

  echo "=== /avaliar GitHub PR #${PR_NUMBER} ==="
  echo "repo: $GITHUB_REPOSITORY"
  echo "projeto: $PROJECT"
  echo "modo: $llm_mode"
  echo "arquivos no diff: ${#files[@]}"
  echo ""

  if [[ "${#files[@]}" -eq 0 ]]; then
    post_summary "$llm_mode" "$SUMMARY_FILES_LOG" 0
    echo "Nenhum arquivo revisável no diff."
    exit 0
  fi

  for file in "${files[@]}"; do
    [[ -n "$file" ]] || continue
    [[ -f "$PROJECT/$file" ]] || continue

    inline_count=0
    blob_sha="$(file_blob_sha "$file")"
    prev_sha="$(state_get_file_sha "$file")"

    if [[ "$prev_sha" == "$blob_sha" ]]; then
      echo "► $file — pulado (sem alteração desde última review)"
      skipped=$((skipped + 1))
      summary_log_file skip "$file"
      continue
    fi

    echo "► $file"
    stack="$(infer_stack "$file")"
    static_output=""
    check_status=0
    static_output="$(HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" REVIEW_CHECK_CI=1 "$TOOLS_DIR/check-inbox.sh" "$PROJECT/$file" 2>&1)" || check_status=$?

    local static_verdict="OK"
    if [[ "$check_status" -ne 0 ]]; then
      static_verdict="Ajustes necessários"
    fi

    verdict="$static_verdict"
    report_body=""
    origin="/avaliar automático (CI)"

    if llm_enabled; then
      printf '%s' "$static_output" >"$tmp_dir/static.log"
      file_diff_hunk "$file" >"$tmp_dir/diff.patch"
      report_file="$tmp_dir/report.md"
      echo "  … LLM ($(date -u +%H:%M:%S) UTC)"
      if run_llm_review "$file" "$tmp_dir/static.log" "$tmp_dir/diff.patch" "$report_file"; then
        echo "  ✓ LLM ($(date -u +%H:%M:%S) UTC)"
        report_body="$(cat "$report_file")"
        verdict="$(parse_verdict_from_report "$report_body")"
        origin="/avaliar automático (CI — estático + LLM)"
        save_report_copy "$file" "$report_file"
        inline_count="$(post_inline_findings "$file" "$report_body" "$tmp_dir/findings.blocks")"
        if [[ "${inline_count:-0}" -gt 0 ]]; then
          echo "  ✓ ${inline_count} inline(s) no diff"
        fi
      else
        echo "  ⚠ LLM falhou — fallback estático" >&2
        report_body="$(build_static_fallback_report "$file" "$stack" "$static_verdict" "$static_output")"
        verdict="$static_verdict"
      fi
    else
      report_body="$(build_static_fallback_report "$file" "$stack" "$static_verdict" "$static_output")"
      verdict="$static_verdict"
    fi

    if [[ "${inline_count:-0}" -eq 0 ]]; then
      if [[ -n "${report_file:-}" && -f "${report_file:-}" ]]; then
        echo "  · sem inline acionável (relatório no artifact)"
      else
        local comment_body
        comment_body="$(wrap_pr_comment "$file" "$blob_sha" "$report_body" "$origin")"
        upsert_file_comment "$file" "$comment_body"
      fi
    fi
    state_set_file_sha "$file" "$blob_sha"
    reviewed=$((reviewed + 1))

    local blocking_count=0
    if [[ -f "$SUMMARY_INLINE_LOG" ]]; then
      blocking_count="$(awk -F'\t' -v f="$file" '$1 == f && $5 == "1" { c++ } END { print c + 0 }' "$SUMMARY_INLINE_LOG")"
    fi
    if [[ "$blocking_count" -eq 0 ]] && [[ -n "$report_body" ]] && report_has_impeditivo "$report_body"; then
      blocking_count=1
    fi
    summary_log_file review "$file" "$verdict" "${inline_count:-0}" "$blocking_count"

    if verdict_is_failure "$verdict"; then
      failed=$((failed + 1))
    fi
  done

  state_save
  post_summary "$llm_mode" "$SUMMARY_FILES_LOG" "${#files[@]}"

  echo ""
  echo "=== Concluído: ${reviewed} revisado(s), ${skipped} pulado(s), ${failed} com achados ==="

  if [[ "${REVIEW_AVALIAR_SOFT:-true}" == "true" ]]; then
    if [[ "$failed" -gt 0 ]]; then
      echo "Modo soft: ${failed} arquivo(s) com achados — PR não bloqueado."
    fi
    exit 0
  fi

  if [[ "$failed" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
