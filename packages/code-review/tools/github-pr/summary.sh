#!/usr/bin/env bash
# Comentário por arquivo e resumo do PR.
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
  local table_json

  if [[ -f "$files_log" ]]; then
    table_json="$(pr_report format-files-table <"$files_log")"
    eval "$(
      printf '%s' "$table_json" | node --input-type=module -e '
import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync(0, "utf8"));
const q = (s) => "'"'"'" + String(s).replace(/'"'"'/g, "'"'"'\\\\'"'"''"'"'") + "'"'"'";
process.stdout.write("files_section=" + q(d.table || "") + "\n");
const s = d.stats || {};
for (const k of ["reviewed", "skipped", "failed", "inline_this_run", "blocking_this_run"]) {
  process.stdout.write(k + "=" + Number(s[k] || 0) + "\n");
}
'
    )"
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
