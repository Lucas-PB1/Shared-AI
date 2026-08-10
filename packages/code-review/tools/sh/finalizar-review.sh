#!/usr/bin/env bash
# Finaliza review: dual-write decisões → store (obrigatório).
# Rascunhos opcionais em workdir tmp (HOSTDIME_REVIEW_WORKDIR).
# Uso: finalizar-review.sh [arquivo]
set -euo pipefail

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_review-workdir.sh
source "$TOOLS_DIR/_review-workdir.sh"

TARGET="${1:-}"

resolve_project_root() {
  if [[ -n "${CURSOR_PROJECT_DIR:-}" && -d "${CURSOR_PROJECT_DIR}" ]]; then
    printf '%s' "$(cd "$CURSOR_PROJECT_DIR" && pwd)"
    return
  fi
  if git rev-parse --show-toplevel >/dev/null 2>&1; then
    printf '%s' "$(git rev-parse --show-toplevel)"
    return
  fi
  echo "Erro: identifique o projeto (git root ou CURSOR_PROJECT_DIR)" >&2
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
  project="$(resolve_project_root)"
  reports="$(hostdime_review_workdir "$project")/reports"

  latest_report="$(find "$reports" -maxdepth 1 -type f -name '*.md' ! -name 'diff-*' \
    -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2- || true)"

  if [[ -n "$latest_report" && -f "$latest_report" ]]; then
    path_from_report="$(grep -m1 '^## `' "$latest_report" 2>/dev/null \
      | sed 's/^## `\([^`]*\)`.*/\1/' || true)"
    if [[ -n "$path_from_report" && -f "$project/$path_from_report" ]]; then
      printf '%s\n' "$project/$path_from_report"
      return
    fi
  fi

  echo "Erro: informe o caminho do arquivo (relatório opcional no workdir)." >&2
  exit 1
}

find_report() {
  local reports_dir="$1"
  local slug="$2"
  local match=""
  [[ -d "$reports_dir" ]] || { printf '%s\n' ""; return; }
  match="$(find "$reports_dir" -maxdepth 1 -type f -name "*_${slug}.md" 2>/dev/null \
    | sort -r | head -1 || true)"
  if [[ -z "$match" ]]; then
    match="$(find "$reports_dir" -maxdepth 1 -type f -name "*${slug}*.md" 2>/dev/null \
      | sort -r | head -1 || true)"
  fi
  printf '%s\n' "$match"
}

main() {
  local target project_root review_root reports output rel slug date_prefix base dest dest_name report rel_codigo

  target="$(resolve_target)"
  project_root="$(resolve_project_root)"
  review_root="$(hostdime_review_workdir "$project_root")"
  reports="$review_root/reports"
  output="$review_root/resultados"
  mkdir -p "$reports" "$output"

  rel="${target#"$project_root"/}"
  [[ "$rel" == "$target" ]] && rel="$(basename "$target")"
  slug="$(slug_from_path "$rel")"

  report="$(find_report "$reports" "$slug")"
  if [[ -n "$report" && -f "$report" ]]; then
    date_prefix="$(date +%Y-%m-%d)"
    if [[ "$(basename "$report")" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})_ ]]; then
      date_prefix="${BASH_REMATCH[1]}"
    fi
    base="${output}/${date_prefix}_${slug}"
    dest="$base"
    dest_name="$(basename "$dest")"
    if [[ -d "$dest" ]]; then
      local n=2
      while [[ -d "${base}-${n}" ]]; do n=$((n + 1)); done
      dest="${base}-${n}"
      dest_name="$(basename "$dest")"
    fi
    mkdir -p "$dest/codigo"
    cp "$report" "$dest/relatorio.md"
    rel_codigo="$rel"
    mkdir -p "$dest/codigo/$(dirname "$rel_codigo")"
    cp "$target" "$dest/codigo/$(basename "$rel_codigo")"
    cat >"$dest/meta.txt" <<EOF
data: $(date -Iseconds)
arquivo: ${rel}
slug: ${slug}
workdir: ${review_root}
veredito: $(grep -m1 '^\*\*Veredito:\*\*' "$report" | sed 's/^\*\*Veredito:\*\* //' || echo '?')
EOF
    rm -f "$report"
    echo "Empacotado (tmp): ${dest}"
  else
    echo "Sem relatório no workdir — só dual-write store."
  fi

  local root_ia tsx
  root_ia="${HOSTDIME_IA_ROOT:-}"
  if [[ -z "$root_ia" && -f "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env" ]]; then
    # shellcheck disable=SC1090
    source "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env" 2>/dev/null || true
    root_ia="${HOSTDIME_IA_ROOT:-}"
  fi
  if [[ -z "$root_ia" ]]; then
    echo "Erro: HOSTDIME_IA_ROOT não definido — dual-write store obrigatório" >&2
    exit 1
  fi
  tsx="$root_ia/node_modules/.bin/tsx"
  if [[ ! -x "$tsx" && ! -f "$tsx" ]]; then
    echo "Erro: tsx não encontrado em $tsx" >&2
    exit 1
  fi
  # Secrets vêm do monorepo (HOSTDIME_IA_ROOT/.env). Slug = nome do repo revisado
  # (ex. dna) — projetos ligados não precisam de .env próprio.
  local slug
  slug="$(basename "$project_root" | tr '[:upper:]' '[:lower:]')"
  echo "→ dual-write store (slug=${slug})…"
  HOSTDIME_IA_ROOT="$root_ia" \
    "$tsx" "$root_ia/packages/code-review/bin/review-dual-write.ts" \
      --project "$project_root" \
      --slug "$slug"
}

main "$@"
