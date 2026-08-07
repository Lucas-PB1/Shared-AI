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

report_has_impeditivo() {
  local report="$1"
  printf '%s' "$report" | grep -qE '^### Impeditivo' && return 0
  [[ "$(parse_verdict_from_report "$report")" == "Não recomendado" ]]
}

block_is_impeditivo() {
  local report="$1"
  local block="$2"
  local title impeditivo_section
  title="$(printf '%s' "$block" | awk '/^#### / { print; exit }')"
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
  # grep -F: título do LLM pode conter aspas/backslash — awk -v quebra nesses casos
  printf '%s' "$impeditivo_section" | grep -qF -- "$title"
}

extract_block_title() {
  local block="$1"
  local title
  title="$(printf '%s' "$block" | awk '/^#### / { print; exit }')"
  [[ -n "$title" ]] || return 1
  if [[ "$title" =~ ^####[[:space:]]+(.+)$ ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
  else
    printf '%s' "$title"
  fi
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

find_inline_comment_id() {
  local file="$1"
  local start_line="$2"
  local marker="<!-- avaliar-inline:${file}:${start_line} -->"
  gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments" --paginate \
    | jq -r --arg m "$marker" '.[] | select(.body | contains($m)) | .id' | head -1
}

extract_section_code() {
  local block="$1"
  local section="$2"
  printf '%s' "$block" | awk -v section="$section" '
    BEGIN { marker = "^\\*\\*" section ":\\*\\*$" }
    $0 ~ marker { found = 1; next }
    found && /^\*\*/ { exit }
    found && /^```/ {
      if (in_fence) { exit }
      in_fence = 1
      next
    }
    found && in_fence && /^```/ { exit }
    found && in_fence { print }
  '
}

count_code_lines() {
  local code="$1"
  if [[ -z "$code" ]]; then
    printf '0'
    return 0
  fi
  printf '%s' "$code" | awk 'END { print NR + 0 }'
}

resolve_de_start_line() {
  local file="$1"
  local hint_line="$2"
  local de_code="$3"
  local trimmed line_num
  trimmed="$(printf '%s' "$de_code" | sed '/./,$!d' | head -1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ -n "$trimmed" ]] || { printf '%s' "$hint_line"; return 0; }

  line_num="$(git -C "$PROJECT" show "${HEAD_SHA:-HEAD}:${file}" 2>/dev/null \
    | awk -v needle="$trimmed" -v hint="$hint_line" '
      index($0, needle) {
        n = NR
        d = n - hint
        if (d < 0) d = -d
        print d, n
      }
    ' | sort -n | head -1 | awk '{ print $2 }')"
  if [[ -n "$line_num" ]]; then
    printf '%s' "$line_num"
  else
    printf '%s' "$hint_line"
  fi
}

file_snippet_at_range() {
  local file="$1"
  local start="$2"
  local end="$3"
  git -C "$PROJECT" show "${HEAD_SHA:-HEAD}:${file}" 2>/dev/null | sed -n "${start},${end}p"
}

normalize_code_snippet() {
  local code="$1"
  printf '%s' "$code" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed '/^[[:space:]]*$/d'
}

code_snippets_match() {
  local expected="$1"
  local actual="$2"
  local ne na
  ne="$(normalize_code_snippet "$expected")"
  na="$(normalize_code_snippet "$actual")"
  [[ "$ne" == "$na" ]]
}

extract_pt_summary() {
  local block="$1"
  printf '%s' "$block" | awk '
    /^\*\*Em português:\*\*/ { found = 1; next }
    found && /^> / { sub(/^> /, ""); print; exit }
    found && /^>/ { sub(/^>/, ""); print; exit }
  '
}

# Comentário inline curto — título + resumo PT. De/Para/GitHub ficam só no artifact.
build_inline_comment_body() {
  local block="$1"
  local title summary body

  title="$(printf '%s' "$block" | awk '/^#### / { print; exit }')"
  [[ -n "$title" ]] || return 1
  if [[ "$title" =~ ^####[[:space:]]+(.+)$ ]]; then
    title="${BASH_REMATCH[1]}"
  fi

  summary="$(extract_pt_summary "$block")"
  body="$title"
  if [[ -n "$summary" ]]; then
    body+=$'\n\n'"${summary}"
  fi
  printf '%s' "$body"
}

# Localiza o intervalo exato do De no arquivo (evita suggestion na linha errada).
resolve_de_range_start() {
  local file="$1"
  local hint_line="$2"
  local de_code="$3"
  local tmp_file tmp_de
  tmp_file="$(mktemp)"
  tmp_de="$(mktemp)"
  git -C "$PROJECT" show "${HEAD_SHA:-HEAD}:${file}" 2>/dev/null >"$tmp_file" || true
  normalize_code_snippet "$de_code" >"$tmp_de"
  awk -v hint="$hint_line" -v de_file="$tmp_de" '
    BEGIN {
      while ((getline line < de_file) > 0) {
        sub(/^[ \t]+/, "", line)
        gsub(/[ \t]+$/, "", line)
        if (line == "") continue
        n_de++
        de[n_de] = line
      }
      close(de_file)
      if (n_de == 0) { print hint; exit }
    }
    {
      sub(/^[ \t]+/, "", $0)
      gsub(/[ \t]+$/, "", $0)
      file[NR] = $0
      n_file = NR
    }
    END {
      best = 0
      best_dist = 1e9
      for (i = 1; i <= n_file - n_de + 1; i++) {
        ok = 1
        for (j = 1; j <= n_de; j++) {
          if (file[i + j - 1] != de[j]) { ok = 0; break }
        }
        if (!ok) continue
        mid = i + int((n_de - 1) / 2)
        d = mid - hint
        if (d < 0) d = -d
        if (d < best_dist) { best_dist = d; best = i }
      }
      if (best > 0) print best
      else print hint
    }
  ' "$tmp_file"
  rm -f "$tmp_file" "$tmp_de"
}

# Retorna 0 se suggestion válida; define SUGGESTION_BODY, SUGGESTION_START, SUGGESTION_END.
prepare_github_suggestion() {
  local file="$1"
  local block="$2"
  local de_code para_code title summary de_lines para_lines hint start end actual

  SUGGESTION_BODY=""
  SUGGESTION_START=""
  SUGGESTION_END=""

  de_code="$(extract_section_code "$block" "De")"
  para_code="$(extract_section_code "$block" "Para")"
  [[ -n "$de_code" && "$block" == *'**Para:**'* ]] || return 1

  de_lines="$(count_code_lines "$de_code")"
  para_lines="$(count_code_lines "$para_code")"
  [[ "$de_lines" -ge 1 && "$de_lines" -le 10 ]] || return 1
  [[ "$de_lines" -eq "$para_lines" ]] || return 1

  title="$(printf '%s' "$block" | awk '/^#### / { print; exit }')"
  summary="$(extract_pt_summary "$block")"
  hint=""
  if [[ "$title" =~ ^####[[:space:]]+[^:]+:([0-9]+) ]]; then
    hint="${BASH_REMATCH[1]}"
  else
    return 1
  fi

  start="$(resolve_de_range_start "$file" "$hint" "$de_code")"
  end=$((start + de_lines - 1))
  actual="$(file_snippet_at_range "$file" "$start" "$end")"
  code_snippets_match "$de_code" "$actual" || return 1

  local body
  body="$(build_inline_comment_body "$block")"
  [[ -n "$body" ]] || return 1
  body+=$'\n\n'"\`\`\`suggestion"
  body+=$'\n'"${para_code}"
  body+=$'\n'"\`\`\`"

  SUGGESTION_BODY="$body"
  SUGGESTION_START="$start"
  SUGGESTION_END="$end"
  return 0
}

upsert_inline_comment() {
  local file="$1"
  local end_line="$2"
  local body="$3"
  local start_line="${4:-$2}"
  local head="${HEAD_SHA:-HEAD}"
  local marker="<!-- avaliar-inline:${file}:${start_line} -->"
  local comment_id
  local full_body="$body"

  if [[ "$full_body" != *"$marker"* ]]; then
    full_body="${full_body}"$'\n\n'"${marker}"
  fi

  comment_id="$(find_inline_comment_id "$file" "$start_line")"
  if [[ -n "$comment_id" && "$comment_id" != "null" ]]; then
    gh api --method DELETE "repos/${GITHUB_REPOSITORY}/pulls/comments/${comment_id}" >/dev/null 2>&1 || true
  fi

  if [[ "$start_line" != "$end_line" ]]; then
    gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments" \
      -f body="$full_body" \
      -f commit_id="$head" \
      -f path="$file" \
      -F start_line="$start_line" \
      -f start_side="RIGHT" \
      -F line="$end_line" \
      -f side="RIGHT" >/dev/null 2>&1
  else
    gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments" \
      -f body="$full_body" \
      -f commit_id="$head" \
      -f path="$file" \
      -F line="$end_line" \
      -f side="RIGHT" >/dev/null 2>&1
  fi
}

# Um inline por linha com achado acionável (De/Para). Ignora notas de Revisado (diff).
post_inline_findings() {
  local file="$1"
  local report="$2"
  local tmp_blocks="$3"
  local posted=0

  [[ "${REVIEW_AVALIAR_INLINE:-1}" == "1" ]] || { printf '0'; return 0; }

  awk '
    BEGIN { sep = sprintf("%c", 30) }
    /^#### / {
      if (block != "") {
        printf "%s%s", block, sep
      }
      block = $0
      next
    }
    { block = (block == "" ? $0 : block ORS $0) }
    END {
      if (block != "") {
        printf "%s%s", block, sep
      }
    }
  ' <<< "$report" >"$tmp_blocks"

  declare -A best_block
  declare -A best_score
  declare -A best_start
  local rs=$'\036'

  while IFS= read -r -d "$rs" block || [[ -n "${block:-}" ]]; do
    [[ -z "$block" ]] && continue
    [[ "$block" =~ ^####[[:space:]]+[^:]+:([0-9]+)[[:space:]][—-][[:space:]]+(.*)$ ]] || continue
    local line_no="${BASH_REMATCH[1]}"
    local score=0
    [[ "$block" == *'**De:**'* ]] && score=3
    [[ "$block" == *'**Para:**'* ]] && score=2
    [[ "$score" -eq 0 ]] && continue

    if [[ -z "${best_block[$line_no]:-}" || ${best_score[$line_no]:-0} -lt $score ]]; then
      best_block[$line_no]="$block"
      best_score[$line_no]=$score
      best_start[$line_no]="$line_no"
    fi
  done < "$tmp_blocks"

  # Remove inline antigo deste arquivo que não é mais achado acionável.
  local prefix="<!-- avaliar-inline:${file}:"
  while IFS=$'\t' read -r comment_id body; do
    [[ -z "$comment_id" ]] && continue
    local stale=1
    for line_no in "${!best_block[@]}"; do
      local start_key="${best_start[$line_no]:-$line_no}"
      if [[ "$body" == *"<!-- avaliar-inline:${file}:${start_key} -->"* ]]; then
        stale=0
        break
      fi
    done
    if [[ "$stale" -eq 1 ]]; then
      gh api --method DELETE "repos/${GITHUB_REPOSITORY}/pulls/comments/${comment_id}" >/dev/null 2>&1 || true
    fi
  done < <(
    gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments" --paginate \
      | jq -r --arg p "$prefix" '.[] | select(.body | contains($p)) | "\(.id)\t\(.body)"'
  )

  local line_no block gh_body start_line end_line use_suggestion
  use_suggestion="${REVIEW_AVALIAR_SUGGESTION:-1}"
  for line_no in "${!best_block[@]}"; do
    block="${best_block[$line_no]}"
    start_line="${best_start[$line_no]:-$line_no}"
    end_line="$start_line"

    gh_body="$(build_inline_comment_body "$block")"
    [[ -n "$gh_body" ]] || continue

    local blocking_flag=0
    if block_is_impeditivo "$report" "$block"; then
      blocking_flag=1
      gh_body+=$'\n\n'"<!-- avaliar-blocking -->"
    fi

    if [[ "$use_suggestion" == "1" ]] && prepare_github_suggestion "$file" "$block"; then
      gh_body="$SUGGESTION_BODY"
      start_line="$SUGGESTION_START"
      end_line="$SUGGESTION_END"
      if [[ "$blocking_flag" -eq 1 ]] && [[ "$gh_body" != *'avaliar-blocking'* ]]; then
        gh_body+=$'\n\n'"<!-- avaliar-blocking -->"
      fi
    fi

    if upsert_inline_comment "$file" "$end_line" "$gh_body" "$start_line"; then
      posted=$((posted + 1))
      local inline_title
      inline_title="$(extract_block_title "$block" || true)"
      summary_log_inline "$file" "$start_line" "$end_line" "${inline_title:-—}" "$blocking_flag"
    fi
  done

  printf '%s' "$posted"
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
  local llm_mode="$1"
  local files_log="$2"
  local total_in_diff="$3"
  local marker="<!-- avaliar-pr-summary -->"
  local head_short="${HEAD_SHA:-HEAD}"
  head_short="${head_short:0:7}"

  local reviewed=0 skipped=0 failed=0 inline_this_run=0 blocking_this_run=0
  local files_section="" merge_section=""
  local line action file verdict inline_count blocking

  if [[ -f "$files_log" ]]; then
    while IFS=$'\t' read -r action file verdict inline_count blocking; do
      [[ -z "$file" ]] && continue
      case "$action" in
        review)
          reviewed=$((reviewed + 1))
          inline_this_run=$((inline_this_run + inline_count))
          blocking_this_run=$((blocking_this_run + blocking))
          if verdict_is_failure "$verdict"; then
            failed=$((failed + 1))
          fi
          local status_icon="✅ revisado"
          if [[ "${inline_count:-0}" -gt 0 ]]; then
            status_icon="💬 ${inline_count} comentário(s) inline"
          elif verdict_is_failure "$verdict"; then
            status_icon="⚠️ achado (sem inline acionável)"
          fi
          if [[ "${blocking:-0}" -gt 0 ]]; then
            status_icon="🛑 impeditivo"
          fi
          files_section+=$'| `'"${file}"$'` | '"${status_icon}"$' | '"${verdict:-—}"$' |\n'
          ;;
        skip)
          skipped=$((skipped + 1))
          files_section+=$'| `'"${file}"$'` | ⏭ pulado (já revisado neste head) | — |\n'
          ;;
      esac
    done <"$files_log"
  fi

  local resultado=""
  if [[ "$total_in_diff" -eq 0 ]]; then
    resultado="ℹ️ **Nenhum arquivo revisável** no diff deste PR."
  elif [[ "$reviewed" -eq 0 && "$skipped" -gt 0 && "$inline_this_run" -eq 0 && "$failed" -eq 0 ]]; then
    resultado="✅ **Nenhum achado novo** — ${skipped} arquivo(s) no diff já foram revisados neste head; nada a reavaliar."
  elif [[ "$failed" -eq 0 && "$inline_this_run" -eq 0 && "$blocking_this_run" -eq 0 ]]; then
    if [[ "$reviewed" -gt 0 ]]; then
      resultado="✅ **Nenhum achado** — ${reviewed} arquivo(s) revisado(s) nesta execução, tudo OK."
    else
      resultado="✅ **Nenhum achado** — diff conferido, sem pendências."
    fi
  elif [[ "$blocking_this_run" -gt 0 ]]; then
    resultado="🛑 **Impeditivo** — ${blocking_this_run} achado(s) bloqueante(s) (impacto direto: crash, segurança, dados ou build). **Corrigir antes do merge.**"
  elif [[ "$inline_this_run" -gt 0 || "$failed" -gt 0 ]]; then
    local n=$((inline_this_run > failed ? inline_this_run : failed))
    resultado="⚠️ **${n} achado(s)** — ver comentários inline na aba **Files changed**."
  else
    resultado="ℹ️ Execução concluída — ver detalhes abaixo."
  fi

  if [[ -z "$files_section" && "$total_in_diff" -gt 0 ]]; then
    files_section="| _(sem registro nesta execução)_ | — | — |\n"
  fi

  if [[ "$blocking_this_run" -gt 0 ]]; then
    if [[ "${REVIEW_AVALIAR_SOFT:-true}" == "true" ]]; then
      merge_section="**Merge:** o check do GitHub **não falha** automaticamente (modo soft), mas há achado(s) **impeditivo(s)** — **não mergear** sem corrigir ou resolver no thread."
    else
      merge_section="**Merge:** check **bloqueado** — impeditivo detectado (modo strict)."
    fi
  elif [[ "$inline_this_run" -gt 0 || "$failed" -gt 0 ]]; then
    if [[ "${REVIEW_AVALIAR_SOFT:-true}" == "true" ]]; then
      merge_section="**Merge:** não bloqueia o check (modo soft). Decisões finais: \`/finalizar\` no Cursor ou resposta nos threads."
    else
      merge_section="**Merge:** check **bloqueado** — achados pendentes (modo strict)."
    fi
  else
    merge_section="**Merge:** sem pendências reportadas. Decisões finais: \`/finalizar\` no Cursor se quiser registrar OK formal."
  fi

  local body
  body="$(cat <<EOF
## /avaliar automático

${resultado}

### Arquivos no diff (${total_in_diff})

| Arquivo | Status nesta execução | Veredito |
| --- | --- | --- |
${files_section}

---

| Detalhe | Valor |
| --- | --- |
| Modo | ${llm_mode} |
| Head | \`${head_short}\` |
| Revisados agora | ${reviewed} |
| Pulados (sem diff novo) | ${skipped} |
| Inline nesta execução | ${inline_this_run} |
| Impeditivo nesta execução | ${blocking_this_run} |

${merge_section}

Relatório completo por arquivo: artifact \`avaliar-reports-pr-${PR_NUMBER}\` (quando disponível).

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
      echo "  … LLM"
      if run_llm_review "$file" "$tmp_dir/static.log" "$tmp_dir/diff.patch" "$report_file"; then
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
      # Relatório completo fica no artifact; não colar blob inteiro inline no diff.
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

  # Modo soft (default): comenta no PR sem falhar o check — dev decide no thread.
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
