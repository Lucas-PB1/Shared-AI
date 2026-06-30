#!/usr/bin/env bash
# Empacota relatório + código em .cursor/review/resultados/<data>_<slug>/
# Uso: finalizar-review.sh [arquivo]
#      ~/.cursor/review-finalizar.sh app/Http/Controllers/Foo.php
set -euo pipefail

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-}"

is_inbox_file() {
  [[ "$1" == *"/.cursor/review/inbox/"* ]]
}

resolve_project_root() {
  local file="$1"
  if [[ "$file" == *"/.cursor/review/"* ]]; then
    printf '%s' "${file%%/.cursor/review/*}"
    return
  fi
  if [[ -n "${CURSOR_PROJECT_DIR:-}" && -d "${CURSOR_PROJECT_DIR}/.cursor/review" ]]; then
    printf '%s' "$CURSOR_PROJECT_DIR"
    return
  fi
  if git rev-parse --show-toplevel >/dev/null 2>&1; then
    printf '%s' "$(git rev-parse --show-toplevel)"
    return
  fi
  echo "Erro: não foi possível identificar o projeto (.cursor/review/)" >&2
  exit 1
}

strip_extension() {
  local rel="$1"
  case "$rel" in
    *.blade.php) printf '%s' "${rel%.blade.php}" ;;
    *.tsx) printf '%s' "${rel%.tsx}" ;;
    *.jsx) printf '%s' "${rel%.jsx}" ;;
    *.ts) printf '%s' "${rel%.ts}" ;;
    *.js) printf '%s' "${rel%.js}" ;;
    *.php) printf '%s' "${rel%.php}" ;;
    *) printf '%s' "${rel%.*}" ;;
  esac
}

slug_from_path() {
  local rel="$1"
  rel="${rel#./}"
  if is_inbox_file "$rel" || [[ "$rel" == .cursor/review/inbox/* ]]; then
    rel="${rel#*\.cursor/review/inbox/}"
    rel="${rel#*inbox/}"
    rel="$(strip_extension "$rel")"
    printf '%s' "review-${rel}" | sed 's#/#-#g'
    return
  fi
  rel="$(strip_extension "$rel")"
  printf '%s' "$rel" | sed 's#/#-#g'
}

resolve_target() {
  if [[ -n "$TARGET" ]]; then
    if [[ ! -f "$TARGET" ]]; then
      if [[ -f "$(pwd)/$TARGET" ]]; then
        TARGET="$(cd "$(dirname "$TARGET")" && pwd)/$(basename "$TARGET")"
      elif [[ -n "${CURSOR_PROJECT_DIR:-}" && -f "${CURSOR_PROJECT_DIR}/$TARGET" ]]; then
        TARGET="${CURSOR_PROJECT_DIR}/$TARGET"
      else
        echo "Erro: arquivo não encontrado: $TARGET" >&2
        exit 1
      fi
    elif [[ "$TARGET" != /* ]]; then
      TARGET="$(cd "$(dirname "$TARGET")" && pwd)/$(basename "$TARGET")"
    fi
    printf '%s\n' "$TARGET"
    return
  fi

  local project reports latest_report path_from_report
  project="$(resolve_project_root "${CURSOR_PROJECT_DIR:-.}")"
  reports="$project/.cursor/review/reports"

  latest_report="$(find "$reports" -maxdepth 1 -type f -name '*.md' ! -name 'diff-*' \
    -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2- || true)"

  if [[ -n "$latest_report" && -f "$latest_report" ]]; then
    path_from_report="$(grep -m1 '^## `' "$latest_report" 2>/dev/null \
      | sed 's/^## `\([^`]*\)`.*/\1/' || true)"
    if [[ -n "$path_from_report" ]]; then
      if [[ -f "$project/$path_from_report" ]]; then
        printf '%s\n' "$project/$path_from_report"
        return
      fi
      if [[ -f "$path_from_report" ]]; then
        printf '%s\n' "$(cd "$(dirname "$path_from_report")" && pwd)/$(basename "$path_from_report")"
        return
      fi
    fi
  fi

  echo "Erro: informe o caminho do arquivo ou rode /avaliar antes." >&2
  exit 1
}

find_report() {
  local reports_dir="$1"
  local slug="$2"
  local match
  match="$(find "$reports_dir" -maxdepth 1 -type f -name "*_${slug}.md" 2>/dev/null \
    | sort -r | head -1 || true)"
  if [[ -z "$match" ]]; then
    match="$(find "$reports_dir" -maxdepth 1 -type f -name "*${slug}*.md" 2>/dev/null \
      | sort -r | head -1 || true)"
  fi
  printf '%s\n' "$match"
}

main() {
  local target project_root review_root inbox reports output rel slug date_prefix base dest dest_name report rel_codigo codigo_dest from_inbox

  target="$(resolve_target)"
  project_root="$(resolve_project_root "$target")"
  review_root="$project_root/.cursor/review"
  inbox="$review_root/inbox"
  reports="$review_root/reports"
  output="$review_root/resultados"

  rel="${target#"$project_root"/}"
  [[ "$rel" == "$target" ]] && rel="$(basename "$target")"
  slug="$(slug_from_path "$rel")"
  from_inbox=0
  is_inbox_file "$target" && from_inbox=1

  date_prefix="$(date +%Y-%m-%d)"
  base="${output}/${date_prefix}_${slug}"
  dest="$base"
  dest_name="$(basename "$dest")"

  if [[ -d "$dest" ]]; then
    local n=2
    while [[ -d "${base}-${n}" ]]; do
      n=$((n + 1))
    done
    dest="${base}-${n}"
    dest_name="$(basename "$dest")"
  fi

  report="$(find_report "$reports" "$slug")"
  if [[ -z "$report" || ! -f "$report" ]]; then
    echo "Erro: relatório não encontrado em .cursor/review/reports/ para slug: ${slug}" >&2
    echo "Rode /avaliar antes de finalizar." >&2
    exit 1
  fi

  mkdir -p "$dest/codigo"

  cp "$report" "$dest/relatorio.md"

  if [[ "$from_inbox" -eq 1 ]]; then
    rel_codigo="${target#"$inbox"/}"
  else
    rel_codigo="$rel"
  fi
  codigo_dest="$dest/codigo/$(dirname "$rel_codigo")"
  mkdir -p "$codigo_dest"
  cp "$target" "$codigo_dest/$(basename "$rel_codigo")"

  cat >"$dest/meta.txt" <<EOF
data: $(date -Iseconds)
arquivo: ${rel}
slug: ${slug}
origem: $([[ "$from_inbox" -eq 1 ]] && echo inbox || echo projeto)
relatorio_origem: ${report#"$project_root"/}
veredito: $(grep -m1 '^\*\*Veredito:\*\*' "$report" | sed 's/^\*\*Veredito:\*\* //' || echo '?')
EOF

  rm -f "$report"

  if [[ "$from_inbox" -eq 1 ]]; then
    rm -f "$target"
    find "$inbox" -type d -empty ! -path "$inbox" -delete 2>/dev/null || true
  fi

  echo "Empacotado em: .cursor/review/resultados/${dest_name}/"
  echo "  relatorio.md"
  echo "  codigo/${rel_codigo}"
  echo "  meta.txt"
  if [[ "$from_inbox" -eq 1 ]]; then
    echo "Limpo: inbox/ e reports/"
  else
    echo "Limpo: reports/ (arquivo do projeto preservado: ${rel})"
  fi
}

main "$@"
