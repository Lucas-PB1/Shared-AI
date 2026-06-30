#!/usr/bin/env bash
# Empacota relatório + código em .cursor/review/resultados/<data>_<slug>/
# Uso: finalizar-review.sh [arquivo]
#      npm run review:finalizar -- .cursor/review/inbox/foo.php
set -euo pipefail

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-}"

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
  echo "Erro: não foi possível identificar o projeto (.cursor/review/)" >&2
  exit 1
}

slug_from_path() {
  local rel="$1"
  rel="${rel#./}"
  rel="${rel#*\.cursor/review/inbox/}"
  case "$rel" in
    *.blade.php) rel="${rel%.blade.php}" ;;
    *.tsx) rel="${rel%.tsx}" ;;
    *.jsx) rel="${rel%.jsx}" ;;
    *.ts) rel="${rel%.ts}" ;;
    *.js) rel="${rel%.js}" ;;
    *.php) rel="${rel%.php}" ;;
    *) rel="${rel%.*}" ;;
  esac
  printf '%s' "review-${rel}" | sed 's#/#-#g'
}

resolve_target() {
  if [[ -n "$TARGET" ]]; then
    if [[ ! -f "$TARGET" ]]; then
      if [[ -f "$(pwd)/$TARGET" ]]; then
        TARGET="$(cd "$(dirname "$TARGET")" && pwd)/$(basename "$TARGET")"
      elif [[ -n "${CURSOR_PROJECT_DIR:-}" && -f "${CURSOR_PROJECT_DIR}/$TARGET" ]]; then
        TARGET="${CURSOR_PROJECT_DIR}/$TARGET"
      else
        echo "Erro: arquivo não encontrado: $1" >&2
        exit 1
      fi
    elif [[ "$TARGET" != /* ]]; then
      TARGET="$(cd "$(dirname "$TARGET")" && pwd)/$(basename "$TARGET")"
    fi
    printf '%s\n' "$TARGET"
    return
  fi

  local project inbox latest
  project="$(resolve_project_root "${CURSOR_PROJECT_DIR:-.}")"
  inbox="$project/.cursor/review/inbox"
  latest="$(find "$inbox" -type f ! -name '.gitkeep' -printf '%T@ %p\n' 2>/dev/null \
    | sort -rn | head -1 | cut -d' ' -f2- || true)"

  if [[ -z "$latest" ]]; then
    echo "Erro: nenhum arquivo em .cursor/review/inbox/. Informe o caminho." >&2
    exit 1
  fi
  printf '%s\n' "$latest"
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
  local target project_root review_root inbox reports output rel slug date_prefix base dest dest_name report rel_inbox codigo_dest

  target="$(resolve_target)"
  project_root="$(resolve_project_root "$target")"
  review_root="$project_root/.cursor/review"
  inbox="$review_root/inbox"
  reports="$review_root/reports"
  output="$review_root/resultados"

  rel="${target#"$project_root"/}"
  slug="$(slug_from_path "$rel")"
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

  rel_inbox="${target#"$inbox"/}"
  if [[ "$rel_inbox" == "$target" ]]; then
    rel_inbox="$(basename "$target")"
  fi
  codigo_dest="$dest/codigo/$(dirname "$rel_inbox")"
  mkdir -p "$codigo_dest"
  cp "$target" "$codigo_dest/$(basename "$target")"

  cat >"$dest/meta.txt" <<EOF
data: $(date -Iseconds)
arquivo: ${rel}
slug: ${slug}
relatorio_origem: ${report#"$project_root"/}
veredito: $(grep -m1 '^\*\*Veredito:\*\*' "$report" | sed 's/^\*\*Veredito:\*\* //' || echo '?')
EOF

  rm -f "$target" "$report"
  find "$inbox" -type d -empty ! -path "$inbox" -delete 2>/dev/null || true

  echo "Empacotado em: .cursor/review/resultados/${dest_name}/"
  echo "  relatorio.md"
  echo "  codigo/${rel_inbox}"
  echo "  meta.txt"
  echo "Limpo: .cursor/review/inbox/ e reports/"
}

main "$@"
