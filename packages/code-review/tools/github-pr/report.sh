#!/usr/bin/env bash
# Relatório estático/LLM e cópia em .cursor/review/reports.
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

  "$HOSTDIME_TSX" "$HOSTDIME_IA_ROOT/packages/code-review/bin/review-llm.ts" \
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
