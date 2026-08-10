#!/usr/bin/env bash
# Review estático em arquivos alterados — paridade com /avaliar no Cursor.
# Uso: HOSTDIME_IA_ROOT=/caminho/hostdime-ia review-ci.sh [base-ref]
#      bash packages/code-review/tools/review-ci.sh main
set -euo pipefail

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOSTDIME_IA_ROOT="${HOSTDIME_IA_ROOT:-}"
export REVIEW_CHECK_CI=1

if [[ -z "$HOSTDIME_IA_ROOT" || ! -d "$HOSTDIME_IA_ROOT" ]]; then
  echo "Erro: HOSTDIME_IA_ROOT não configurado ou inválido." >&2
  echo "Ex.: HOSTDIME_IA_ROOT=/caminho/hostdime-ia $0" >&2
  exit 1
fi

if [[ -n "${CI_PROJECT_DIR:-}" && -d "$CI_PROJECT_DIR/.git" ]]; then
  export CURSOR_PROJECT_DIR="$CI_PROJECT_DIR"
elif [[ -n "${CURSOR_PROJECT_DIR:-}" && -d "${CURSOR_PROJECT_DIR}/.git" ]]; then
  # honra projeto já definido (smoke / scripts que apontam o fixture)
  :
elif git rev-parse --show-toplevel >/dev/null 2>&1; then
  export CURSOR_PROJECT_DIR="$(git rev-parse --show-toplevel)"
else
  echo "Erro: execute dentro de um repositório git." >&2
  exit 1
fi

cd "$CURSOR_PROJECT_DIR"

mapfile -t files < <("$TOOLS_DIR/review-diff.sh" "${1:-}")

if [[ "${#files[@]}" -eq 0 ]]; then
  echo "Nenhum arquivo revisável no diff."
  exit 0
fi

echo "HostDime review CI — ${#files[@]} arquivo(s)"
echo "HOSTDIME_IA_ROOT=$HOSTDIME_IA_ROOT"
echo "projeto=$CURSOR_PROJECT_DIR"
echo ""

failures=0
for file in "${files[@]}"; do
  [[ -n "$file" ]] || continue
  target="$CURSOR_PROJECT_DIR/$file"
  if [[ ! -f "$target" ]]; then
    echo "⚠ ignorado (não encontrado): $file" >&2
    continue
  fi
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "► $file"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if ! HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" "$TOOLS_DIR/check-inbox.sh" "$target"; then
    failures=$((failures + 1))
  fi
done

echo ""
if [[ "$failures" -eq 0 ]]; then
  echo "=== CI review: OK (${#files[@]} arquivo(s)) ==="
  exit 0
fi

echo "=== CI review: FALHOU — $failures arquivo(s) com achados ===" >&2
exit 1
