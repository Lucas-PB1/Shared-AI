#!/usr/bin/env bash
# Pre-commit estático (sem LLM) — paridade local com review:ci.
#
# Uso (no projeto alvo, com HOSTDIME_IA_ROOT apontando para o clone):
#   HOSTDIME_IA_ROOT=/path/hostdime-ia bash review-pre-commit.sh
#   # ou
#   npm run pre-commit          # na raiz do hostdime-ia
#
# Variáveis:
#   HOSTDIME_SKIP_PRE_COMMIT=1  — sai 0 sem rodar
#   HOSTDIME_PRE_COMMIT_MAX_FILES (default: 40)
#   HOSTDIME_PRE_COMMIT_SHELLCHECK=0 — desliga shellcheck dos .sh staged
#   HOSTDIME_IA_ROOT — clone do hostdime-ia
set -euo pipefail

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOSTDIME_IA_ROOT="${HOSTDIME_IA_ROOT:-}"
MAX_FILES="${HOSTDIME_PRE_COMMIT_MAX_FILES:-40}"
RUN_SHELLCHECK="${HOSTDIME_PRE_COMMIT_SHELLCHECK:-1}"

if [[ "${HOSTDIME_SKIP_PRE_COMMIT:-}" == "1" || "${HOSTDIME_SKIP_PRE_COMMIT:-}" == "true" ]]; then
  echo "hostdime pre-commit: skip (HOSTDIME_SKIP_PRE_COMMIT)"
  exit 0
fi

if [[ -z "$HOSTDIME_IA_ROOT" || ! -d "$HOSTDIME_IA_ROOT" ]]; then
  # fallback: este script vive em packages/code-review/tools
  if [[ -f "$TOOLS_DIR/../../../../package.json" ]] && grep -q '"name": "hostdime-ia"' "$TOOLS_DIR/../../../../package.json" 2>/dev/null; then
    HOSTDIME_IA_ROOT="$(cd "$TOOLS_DIR/../../../.." && pwd)"
  fi
fi

if [[ -z "$HOSTDIME_IA_ROOT" || ! -d "$HOSTDIME_IA_ROOT" ]]; then
  echo "Erro: HOSTDIME_IA_ROOT não definido." >&2
  exit 1
fi

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Erro: não é um repositório git." >&2
  exit 1
fi

PROJECT="$(git rev-parse --show-toplevel)"
export CURSOR_PROJECT_DIR="$PROJECT"
export HOSTDIME_IA_ROOT
export REVIEW_CHECK_CI=1
cd "$PROJECT"

is_reviewable() {
  case "$1" in
    *.php | *.blade.php | *.js | *.mjs | *.cjs | *.ts | *.tsx | *.jsx) return 0 ;;
    *) return 1 ;;
  esac
}

mapfile -t staged < <(git diff --cached --name-only --diff-filter=ACMR -z 2>/dev/null | tr '\0' '\n' || true)

if [[ "${#staged[@]}" -eq 0 || -z "${staged[0]:-}" ]]; then
  echo "hostdime pre-commit: nada no stage — ok"
  exit 0
fi

review_files=()
shell_files=()
for f in "${staged[@]}"; do
  [[ -n "$f" ]] || continue
  [[ -f "$PROJECT/$f" ]] || continue
  if is_reviewable "$f"; then
    review_files+=("$f")
  fi
  if [[ "$f" == *.sh || "$f" == *.bash ]]; then
    shell_files+=("$f")
  fi
done

if [[ "${#review_files[@]}" -gt "$MAX_FILES" ]]; then
  echo "hostdime pre-commit: ${#review_files[@]} arquivos revisáveis no stage (limite $MAX_FILES)." >&2
  echo "  Faça commit em partes ou: HOSTDIME_SKIP_PRE_COMMIT=1 git commit ..." >&2
  echo "  Ajuste lim: HOSTDIME_PRE_COMMIT_MAX_FILES=N" >&2
  exit 1
fi

failures=0

if [[ "$RUN_SHELLCHECK" != "0" && "${#shell_files[@]}" -gt 0 ]]; then
  if command -v shellcheck >/dev/null 2>&1; then
    echo "hostdime pre-commit: shellcheck (${#shell_files[@]} script(s))"
    if ! shellcheck -x --severity=error "${shell_files[@]}"; then
      failures=$((failures + 1))
    fi
  else
    echo "hostdime pre-commit: shellcheck não instalado — pulando scripts"
  fi
fi

if [[ "${#review_files[@]}" -gt 0 ]]; then
  echo "hostdime pre-commit: review estático (${#review_files[@]} arquivo(s)) — sem LLM"
  for file in "${review_files[@]}"; do
    echo "► $file"
    if ! HOSTDIME_IA_ROOT="$HOSTDIME_IA_ROOT" \
      CURSOR_PROJECT_DIR="$PROJECT" \
      REVIEW_CHECK_CI=1 \
      "$TOOLS_DIR/check-inbox.sh" "$PROJECT/$file"; then
      failures=$((failures + 1))
    fi
  done
fi

if [[ "$failures" -eq 0 ]]; then
  if [[ "${#review_files[@]}" -eq 0 && "${#shell_files[@]}" -eq 0 ]]; then
    echo "hostdime pre-commit: nenhum alvo revisável no stage — ok"
  else
    echo "hostdime pre-commit: OK"
  fi
  exit 0
fi

echo "hostdime pre-commit: FALHOU ($failures)" >&2
echo "  Corrija ou pule com: HOSTDIME_SKIP_PRE_COMMIT=1 git commit ..." >&2
exit 1
