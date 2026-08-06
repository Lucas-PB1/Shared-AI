#!/usr/bin/env bash
# /avaliar automático no GitHub — estático + LLM (Fase 2) + comentários por arquivo.
# Uso (CI): PR_NUMBER=42 REVIEW_DIFF_BASE=<base-sha> HEAD_SHA=<head-sha> review-github-pr.sh
set -euo pipefail

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

resolve_hostdime_ia_root() {
  if [[ -n "${HOSTDIME_IA_ROOT:-}" && -d "$HOSTDIME_IA_ROOT" ]]; then
    printf '%s' "$HOSTDIME_IA_ROOT"
    return
  fi
  printf '%s' "$(cd "$TOOLS_DIR/../../.." && pwd)"
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

llm_enabled() {
  [[ -n "${REVIEW_LLM_API_KEY:-}" ]] || return 1
  [[ "${REVIEW_AVALIAR_MODE:-both}" != "static" ]]
}

parse_verdict_from_report() {
  local report="$1"
  if printf '%s' "$report" | grep -qE '^\*\*Veredito:\*\*[[:space:]]*OK[[:space:]]*$'; then
    printf '%s' "OK"
    return
  fi
  if printf '%s' "$report" | grep -qiE '^\*\*Veredito:\*\*[[:space:]]*N[aã]o recomendado'; then
    printf '%s' "Não recomendado"
    return
  fi
  if printf '%s' "$report" | grep -qiE '^\*\*Veredito:\*\*[[:space:]]*Ajustes necessários'; then
    printf '%s' "Ajustes necessários"
    return
  fi
  printf '%s' "Ajustes necessários"
}

verdict_is_failure() {
  [[ "$1" != "OK" ]]
}

state_load() {
  STATE_JSON='{"files":{}}'
  local comment_id body
  comment_id="$(gh_api_issue_comments | jq -r '.[] | select(.body | contains("<!-- avaliar-pr-state:v1")) | .id' | head -1)"
  if [[ -z "$comment_id" || "$comment_id" == "null" ]]; then
    STATE_COMMENT_ID=""
    return 0
  fi
  STATE_COMMENT_ID="$comment_id"
  body="$(gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" --jq '.body')"
  local json
  json="$(printf '%s' "$body" | awk '
    /<!-- avaliar-pr-state:v1/ { capture = 1; next }
    capture && /^-->$/ { capture = 0; next }
    capture { print }
  ' | tr -d '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  if [[ -n "$json" && "$json" == \{* ]]; then
    STATE_JSON="$json"
  fi
}

state_get_file_sha() {
  local file="$1"
  printf '%s' "$STATE_JSON" | jq -r --arg f "$file" '.files[$f] // empty'
}

state_set_file_sha() {
  local file="$1"
  local sha="$2"
  STATE_JSON="$(printf '%s' "$STATE_JSON" | jq --arg f "$file" --arg s "$sha" '.files[$f] = $s')"
}

state_save() {
  local head="${HEAD_SHA:-HEAD}"
  STATE_JSON="$(printf '%s' "$STATE_JSON" | jq --arg h "$head" '.head = $h')"
  local body
  body="$(cat <<EOF
<!-- avaliar-pr-state:v1
${STATE_JSON}
-->

_Arvore de estado do /avaliar automático — não editar manualmente._
EOF
)"
  if [[ -n "${STATE_COMMENT_ID:-}" ]]; then
    gh api --method PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${STATE_COMMENT_ID}" -f body="$body" >/dev/null
  else
    local new_id
    new_id="$(gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" -f body="$body" --jq '.id')"
    STATE_COMMENT_ID="$new_id"
  fi
}

gh_api_issue_comments() {
  gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" --paginate
}

find_file_comment_id() {
  local file="$1"
  local marker="<!-- avaliar-file:${file} -->"
  gh_api_issue_comments | jq -r --arg m "$marker" '.[] | select(.body | contains($m)) | .id' | head -1
}

build_static_fallback_report() {
  local file="$1"
  local stack="$2"
  local verdict="$3"
  local check_output="$4"

  local body
  body="$(cat <<EOF
## \`${file}\`

**Stack:** ${stack}
**Veredito:** ${verdict}
**Origem:** /avaliar automático (CI — análise estática)

EOF
)"

  if [[ "$verdict" == "OK" ]]; then
    body+=$'\nNenhum achado relevante na análise estática (Semgrep, ESLint, PHPStan, tsc).\n'
  else
    body+=$(
      cat <<EOF

### Achados (estático)

<details>
<summary>Log das ferramentas</summary>

\`\`\`text
${check_output}
\`\`\`

</details>

EOF
    )
  fi

  printf '%s' "$body"
}

wrap_pr_comment() {
  local file="$1"
  local blob_sha="$2"
  local report="$3"
  local origin="$4"

  cat <<EOF
${report}

---
**Origem:** ${origin}
*Review automático · hostdime-ia · \`${blob_sha:0:7}\`*
<!-- avaliar-file:${file} -->
EOF
}

run_llm_review() {
  local file="$1"
  local static_file="$2"
  local diff_file="$3"
  local out_file="$4"

  node "$TOOLS_DIR/review-llm.mjs" \
    --project "$PROJECT" \
    --file "$file" \
    --static-file "$static_file" \
    --diff-file "$diff_file" \
    --output "$out_file"
}

save_report_copy() {
  local file="$1"
  local report_file="$2"
  local slug
  slug="$(printf '%s' "$file" | sed 's/\//-/g;s/\.[^.]*$//')"
  local dest_dir="$PROJECT/.cursor/review/reports"
  mkdir -p "$dest_dir"
  cp "$report_file" "$dest_dir/ci-$(date +%F)_${slug}.md"
}

post_inline_findings() {
  local file="$1"
  local report="$2"
  local head="${HEAD_SHA:-HEAD}"

  [[ "${REVIEW_AVALIAR_INLINE:-1}" == "1" ]] || return 0

  while IFS= read -r line; do
    [[ "$line" =~ ^####[[:space:]]+[^:]+:([0-9]+)[[:space:]]—[[:space:]]+(.*)$ ]] || continue
    local line_no="${BASH_REMATCH[1]}"
    local title="${BASH_REMATCH[2]}"
    local gh_body
    gh_body="$(cat <<EOF
**$(parse_verdict_from_report "$report")** — ${title}

<!-- avaliar-inline:${file}:${line_no} -->
EOF
)"
    gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments" \
      -f body="$gh_body" \
      -f commit_id="$head" \
      -f path="$file" \
      -F line="$line_no" \
      -f side="RIGHT" >/dev/null 2>&1 || true
  done < <(printf '%s\n' "$report")
}

upsert_file_comment() {
  local file="$1"
  local body="$2"
  local comment_id
  comment_id="$(find_file_comment_id "$file")"
  if [[ -n "$comment_id" && "$comment_id" != "null" ]]; then
    gh api --method PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" -f body="$body" >/dev/null
    echo "  ↻ comentário atualizado"
  else
    gh pr comment "$PR_NUMBER" --body "$body" >/dev/null
    echo "  ✓ comentário publicado"
  fi
}

post_summary() {
  local reviewed="$1"
  local skipped="$2"
  local failed="$3"
  local llm_mode="$4"
  local marker="<!-- avaliar-pr-summary -->"
  local body
  body="$(cat <<EOF
## /avaliar automático

| Métrica | Valor |
| --- | --- |
| Revisados nesta execução | ${reviewed} |
| Sem diff novo (pulados) | ${skipped} |
| Com achados (≠ OK) | ${failed} |
| Modo | ${llm_mode} |
| Head | \`${HEAD_SHA:-HEAD}\` |

Relatório no formato \`/avaliar\` por arquivo. Decisões finais: \`/finalizar\` no Cursor.

${marker}
EOF
)"

  local comment_id
  comment_id="$(gh_api_issue_comments | jq -r '.[] | select(.body | contains("<!-- avaliar-pr-summary -->")) | .id' | head -1)"
  if [[ -n "$comment_id" && "$comment_id" != "null" ]]; then
    gh api --method PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" -f body="$body" >/dev/null
  else
    gh pr comment "$PR_NUMBER" --body "$body" >/dev/null
  fi
}

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
    llm_mode="estático + LLM (/avaliar)"
  fi

  local base_arg="${REVIEW_DIFF_BASE:-}"
  mapfile -t files < <("$TOOLS_DIR/review-diff.sh" "$base_arg" 2>/dev/null)

  state_load

  local reviewed=0 skipped=0 failed=0
  local file blob_sha prev_sha stack verdict static_output check_status
  local tmp_dir report_file report_body comment_body origin

  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  echo "=== /avaliar GitHub PR #${PR_NUMBER} ==="
  echo "repo: $GITHUB_REPOSITORY"
  echo "projeto: $PROJECT"
  echo "modo: $llm_mode"
  echo "arquivos no diff: ${#files[@]}"
  echo ""

  if [[ "${#files[@]}" -eq 0 ]]; then
    post_summary 0 0 0 "$llm_mode"
    echo "Nenhum arquivo revisável no diff."
    exit 0
  fi

  for file in "${files[@]}"; do
    [[ -n "$file" ]] || continue
    [[ -f "$PROJECT/$file" ]] || continue

    blob_sha="$(file_blob_sha "$file")"
    prev_sha="$(state_get_file_sha "$file")"

    if [[ "$prev_sha" == "$blob_sha" ]]; then
      echo "► $file — pulado (sem alteração desde última review)"
      skipped=$((skipped + 1))
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
      echo "  … LLM"
      if run_llm_review "$file" "$tmp_dir/static.log" "$tmp_dir/diff.patch" "$report_file"; then
        report_body="$(cat "$report_file")"
        verdict="$(parse_verdict_from_report "$report_body")"
        origin="/avaliar automático (CI — estático + LLM)"
        save_report_copy "$file" "$report_file"
        post_inline_findings "$file" "$report_body"
      else
        echo "  ⚠ LLM falhou — fallback estático" >&2
        report_body="$(build_static_fallback_report "$file" "$stack" "$static_verdict" "$static_output")"
        verdict="$static_verdict"
      fi
    else
      report_body="$(build_static_fallback_report "$file" "$stack" "$static_verdict" "$static_output")"
      verdict="$static_verdict"
    fi

    comment_body="$(wrap_pr_comment "$file" "$blob_sha" "$report_body" "$origin")"
    upsert_file_comment "$file" "$comment_body"
    state_set_file_sha "$file" "$blob_sha"
    reviewed=$((reviewed + 1))

    if verdict_is_failure "$verdict"; then
      failed=$((failed + 1))
    fi
  done

  state_save
  post_summary "$reviewed" "$skipped" "$failed" "$llm_mode"

  echo ""
  echo "=== Concluído: ${reviewed} revisado(s), ${skipped} pulado(s), ${failed} com achados ==="

  if [[ "$failed" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
