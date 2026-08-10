#!/usr/bin/env bash
# Publica comentários inline no PR — sem apagar threads (histórico + reply/Resolve).
#
# - Achado novo (finding_id ainda não no PR) → POST.
# - Mesmo finding_id já existente → mantém o comentário (não DELETE / recria).
# - Achado sumiu do relatório (código corrigido) → thread permanece no PR.
# - Limpeza agressiva só se REVIEW_AVALIAR_INLINE_PURGE=1 (legado; default off).

upsert_inline_comment() {
  local file="$1"
  local end_line="$2"
  local body="$3"
  local start_line="${4:-$2}"
  local title="${5:-}"
  local head="${HEAD_SHA:-HEAD}"
  local marker comment_id full_body="$body"

  [[ -n "$title" ]] || return 1
  marker="$(build_inline_marker "$file" "$start_line" "$title")"

  if [[ "$full_body" != *"$marker"* ]]; then
    full_body="${full_body}"$'\n\n'"${marker}"
  fi

  # Já existe thread para este finding_id: não recria (preserva replies / Resolve).
  comment_id="$(find_inline_comment_id "$file" "$start_line" "$title")"
  if [[ -n "$comment_id" && "$comment_id" != "null" ]]; then
    return 0
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

# Remove inlines deste arquivo cujo finding_id não está no conjunto atual.
# Desligado por padrão — thread deve sobreviver até reply humano / Resolve.
purge_stale_inline_comments() {
  local file="$1"
  shift
  # "$@" = fids ativos (podem ser vazio = purgar todos os avaliar-inline desse path)
  local prefix="<!-- avaliar-inline:${file}:"
  local comment_id body fid stale

  while IFS=$'\t' read -r comment_id body; do
    [[ -z "$comment_id" ]] && continue
    fid="$(printf '%s' "$body" | sed -n 's/.*:fid:\([a-z0-9-]*\)[[:space:]]*-->.*/\1/p' | head -1)"
    stale=1
    if [[ -n "$fid" ]]; then
      for active in "$@"; do
        if [[ "$active" == "$fid" ]]; then
          stale=0
          break
        fi
      done
    fi
    if [[ "$stale" -eq 1 ]]; then
      gh api --method DELETE \
        "repos/${GITHUB_REPOSITORY}/pulls/comments/${comment_id}" \
        >/dev/null 2>&1 || true
    fi
  done < <(
    gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments" --paginate \
      | jq -r --arg p "$prefix" \
        '.[] | select(.body | contains($p)) | "\(.id)\t\(.body)"'
  )
}

# Um inline por linha com achado acionável (De/Para). Ignora notas de Revisado (diff).
post_inline_findings() {
  local file="$1"
  local report="$2"
  local tmp_blocks="$3"
  local posted=0
  local kept=0

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
  declare -A best_fid
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
      local block_title
      block_title="$(extract_block_title "$block" || true)"
      if [[ -n "$block_title" ]]; then
        best_fid[$line_no]="$(compute_finding_id "$block_title")"
      fi
    fi
  done < "$tmp_blocks"

  # Opt-in: limpar threads cujo achado sumiu do relatório (default: não).
  if [[ "${REVIEW_AVALIAR_INLINE_PURGE:-0}" == "1" ]]; then
    local active_fids=()
    local ln
    for ln in "${!best_fid[@]}"; do
      [[ -n "${best_fid[$ln]:-}" ]] && active_fids+=("${best_fid[$ln]}")
    done
    purge_stale_inline_comments "$file" "${active_fids[@]+"${active_fids[@]}"}"
  fi

  local line_no block gh_body start_line end_line use_suggestion title fid existing
  use_suggestion="${REVIEW_AVALIAR_SUGGESTION:-1}"
  for line_no in "${!best_block[@]}"; do
    block="${best_block[$line_no]}"
    start_line="${best_start[$line_no]:-$line_no}"
    end_line="$start_line"
    title="$(extract_block_title "$block")"
    fid="${best_fid[$line_no]:-}"

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

    existing="$(find_inline_comment_id "$file" "$start_line" "$title")"
    if [[ -n "$existing" && "$existing" != "null" ]]; then
      kept=$((kept + 1))
      summary_log_inline "$file" "$start_line" "$end_line" "${title:-—}" "$blocking_flag"
      continue
    fi

    if upsert_inline_comment "$file" "$end_line" "$gh_body" "$start_line" "$title"; then
      posted=$((posted + 1))
      summary_log_inline "$file" "$start_line" "$end_line" "${title:-—}" "$blocking_flag"
    fi
  done

  if [[ "$kept" -gt 0 ]]; then
    echo "  · ${kept} inline(s) já no PR (threads preservados)" >&2
  fi

  printf '%s' "$posted"
}
