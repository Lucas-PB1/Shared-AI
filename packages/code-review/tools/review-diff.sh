#!/usr/bin/env bash
# Lista arquivos alterados revisáveis entre base-ref e HEAD.
# Uso: review-diff.sh [base-ref]
#      ~/.cursor/review-diff.sh main
# stdout: um caminho relativo por linha
# stderr: base usada e contagem
set -euo pipefail

BASE_ARG="${1:-}"
PROJECT=""

is_reviewable() {
  case "$1" in
    *.php | *.blade.php | *.js | *.mjs | *.cjs | *.ts | *.tsx | *.jsx) return 0 ;;
    *) return 1 ;;
  esac
}

resolve_project() {
  if [[ -n "${CI_PROJECT_DIR:-}" && -d "${CI_PROJECT_DIR}/.git" ]]; then
    PROJECT="$CI_PROJECT_DIR"
    export CURSOR_PROJECT_DIR="$CI_PROJECT_DIR"
    return 0
  fi
  if [[ -n "${CURSOR_PROJECT_DIR:-}" && -d "${CURSOR_PROJECT_DIR}/.git" ]]; then
    PROJECT="$CURSOR_PROJECT_DIR"
    return 0
  fi
  if git rev-parse --show-toplevel >/dev/null 2>&1; then
    PROJECT="$(git rev-parse --show-toplevel)"
    return 0
  fi
  echo "Erro: não é um repositório git." >&2
  exit 1
}

resolve_base() {
  local candidate="$1"

  if [[ -n "${REVIEW_DIFF_BASE:-}" ]]; then
    candidate="$REVIEW_DIFF_BASE"
  elif [[ -z "$candidate" && -n "${CI_MERGE_REQUEST_DIFF_BASE_SHA:-}" ]]; then
    candidate="$CI_MERGE_REQUEST_DIFF_BASE_SHA"
  fi

  if [[ -n "$candidate" ]]; then
    if git -C "$PROJECT" rev-parse --verify "$candidate" >/dev/null 2>&1; then
      printf '%s' "$candidate"
      return 0
    fi
    echo "Erro: ref inválida: $candidate" >&2
    exit 1
  fi

  for candidate in main master develop; do
    if git -C "$PROJECT" rev-parse --verify "$candidate" >/dev/null 2>&1; then
      printf '%s' "$candidate"
      return 0
    fi
  done

  if git -C "$PROJECT" rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    printf '%s' "HEAD~1"
    return 0
  fi

  printf '%s' "HEAD"
}

list_changed_files() {
  local base="$1"
  local head="${CI_COMMIT_SHA:-HEAD}"
  local files=""

  if files="$(git -C "$PROJECT" diff --name-only --diff-filter=ACMR "$base...$head" 2>/dev/null)"; then
    printf '%s' "$files"
    return 0
  fi

  git -C "$PROJECT" diff --name-only --diff-filter=ACMR "$base" "$head"
}

main() {
  local base file count=0

  resolve_project
  base="$(resolve_base "$BASE_ARG")"

  while IFS= read -r file; do
    [[ -n "$file" ]] || continue
    [[ -f "$PROJECT/$file" ]] || continue
    is_reviewable "$file" || continue
    printf '%s\n' "$file"
    count=$((count + 1))
  done < <(list_changed_files "$base")

  echo "base: $base" >&2
  echo "arquivos: $count" >&2
}

main "$@"
