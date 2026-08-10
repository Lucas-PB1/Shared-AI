#!/usr/bin/env bash
# Suggestion GitHub + resolução de linha De/Para no archive.
find_inline_comment_id() {
  local file="$1"
  local start_line="$2"
  local title="${3:-}"
  local fid comment_id

  [[ -n "$title" ]] || return 0
  fid="$(compute_finding_id "$title")"
  [[ -n "$fid" ]] || return 0
  comment_id="$(gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments" --paginate \
    | jq -r --arg f "$file" --arg fid ":fid:${fid} -->" '
      .[] | select(.path == $f and (.body | contains($fid))) | .id' | head -1)"
  printf '%s' "$comment_id"
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
  printf '%s' "$code" | pr_report normalize-snippet
}

code_snippets_match() {
  local expected="$1"
  local actual="$2"
  pr_report snippets-match "$expected" "$actual"
}

extract_pt_summary() {
  local block="$1"
  printf '%s' "$block" | pr_report extract-pt
}

# Comentário inline curto — título + resumo PT. De/Para/GitHub ficam só no artifact.
build_inline_comment_body() {
  local block="$1"
  local title summary body

  title="$(extract_block_title "$block")"
  [[ -n "$title" ]] || return 1

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

  title="$(extract_block_title "$block")"
  summary="$(extract_pt_summary "$block")"
  hint=""
  if [[ "$title" =~ ^[^:]+:([0-9]+) ]]; then
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
