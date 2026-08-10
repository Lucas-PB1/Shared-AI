#!/usr/bin/env bash
# Helpers compartilhados do /avaliar GitHub (paths, git, pr_report, summary log).
# Sourceado por review-github-pr.sh — não executar sozinho.

pr_report() {
  "$HOSTDIME_TSX" "$PR_REPORT_TS" "$@"
}

resolve_hostdime_ia_root() {
  if [[ -n "${HOSTDIME_IA_ROOT:-}" && -d "$HOSTDIME_IA_ROOT" ]]; then
    printf '%s' "$HOSTDIME_IA_ROOT"
    return
  fi
  printf '%s' "$(cd "$TOOLS_DIR/../../../.." && pwd)"
}

resolve_project() {
  if [[ -n "${CI_PROJECT_DIR:-}" && -d "${CI_PROJECT_DIR}/.git" ]]; then
    printf '%s' "$CI_PROJECT_DIR"
    return
  fi
  if [[ -n "${CURSOR_PROJECT_DIR:-}" && -d "${CURSOR_PROJECT_DIR}/.git" ]]; then
    printf '%s' "$CURSOR_PROJECT_DIR"
    return
  fi
  if git rev-parse --show-toplevel >/dev/null 2>&1; then
    git rev-parse --show-toplevel
    return
  fi
  echo "Erro: execute dentro de um repositório git." >&2
  exit 1
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Erro: comando obrigatório ausente: $cmd" >&2
    exit 1
  }
}

infer_stack() {
  local file="$1"
  case "$file" in
    *.tsx) printf '%s' "TypeScript / React" ;;
    *.ts) printf '%s' "TypeScript" ;;
    *.jsx) printf '%s' "JavaScript / React" ;;
    *.js|*.mjs|*.cjs) printf '%s' "JavaScript" ;;
    *.php) printf '%s' "PHP" ;;
    *) printf '%s' "—" ;;
  esac
}

file_blob_sha() {
  local file="$1"
  local head="${HEAD_SHA:-HEAD}"
  git -C "$PROJECT" rev-parse "${head}:${file}" 2>/dev/null || git -C "$PROJECT" rev-parse "HEAD:${file}"
}

file_diff_hunk() {
  local file="$1"
  local base="${REVIEW_DIFF_BASE:-main}"
  git -C "$PROJECT" diff "$base...${HEAD_SHA:-HEAD}" -- "$file" 2>/dev/null \
    || git -C "$PROJECT" diff "$base" "${HEAD_SHA:-HEAD}" -- "$file" 2>/dev/null \
    || true
}

first_changed_line() {
  local file="$1"
  local base="${REVIEW_DIFF_BASE:-main}"
  local head="${HEAD_SHA:-HEAD}"
  local line
  line="$(git -C "$PROJECT" diff -U0 "$base" "$head" -- "$file" 2>/dev/null \
    | sed -n 's/^@@ .*+\([0-9][0-9]*\).*/\1/p' | head -1)"
  if [[ -n "$line" ]]; then
    printf '%s' "$line"
    return 0
  fi
  printf '%s' "1"
}

llm_enabled() {
  [[ -n "${CURSOR_API_KEY:-}" || -n "${REVIEW_LLM_API_KEY:-}" ]] || return 1
  [[ "${REVIEW_AVALIAR_MODE:-both}" != "static" ]]
}

parse_verdict_from_report() {
  local report="$1"
  printf '%s' "$report" | pr_report parse-verdict
}

verdict_is_failure() {
  [[ "$1" != "OK" ]]
}

report_has_impeditivo() {
  local report="$1"
  printf '%s' "$report" | grep -qE '^### Impeditivo' && return 0
  [[ "$(parse_verdict_from_report "$report")" == "Não recomendado" ]]
}

block_is_impeditivo() {
  local report="$1"
  local block="$2"
  local title impeditivo_section
  title="$(extract_block_title "$block")"
  [[ -n "$title" ]] || return 1
  if [[ "$(parse_verdict_from_report "$report")" == "Não recomendado" ]]; then
    return 0
  fi
  impeditivo_section="$(printf '%s' "$report" | awk '
    /^### Impeditivo/ { in_sec = 1; next }
    in_sec && /^### / { in_sec = 0 }
    in_sec { print }
  ')"
  [[ -n "$impeditivo_section" ]] || return 1
  printf '%s' "$impeditivo_section" | grep -qF -- "#### ${title}" \
    || printf '%s' "$impeditivo_section" | grep -qF -- "$title"
}

extract_block_title() {
  local block="$1"
  printf '%s' "$block" | pr_report extract-title
}

compute_finding_id() {
  local title="$1"
  printf '%s' "$title" | pr_report finding-id
}

build_inline_marker() {
  local file="$1"
  local start_line="$2"
  local title="$3"
  pr_report inline-marker "$file" "$start_line" "$title"
}

summary_log_file() {
  local action="$1"
  local file="$2"
  local verdict="${3:-—}"
  local inline_count="${4:-0}"
  local blocking="${5:-0}"
  [[ -n "${SUMMARY_FILES_LOG:-}" ]] || return 0
  printf '%s\t%s\t%s\t%s\t%s\n' "$action" "$file" "$verdict" "$inline_count" "$blocking" >>"$SUMMARY_FILES_LOG"
}

summary_log_inline() {
  local file="$1"
  local start_line="$2"
  local end_line="$3"
  local title="$4"
  local blocking="${5:-0}"
  [[ -n "${SUMMARY_INLINE_LOG:-}" ]] || return 0
  printf '%s\t%s\t%s\t%s\t%s\n' "$file" "$start_line" "$end_line" "$title" "$blocking" >>"$SUMMARY_INLINE_LOG"
}
