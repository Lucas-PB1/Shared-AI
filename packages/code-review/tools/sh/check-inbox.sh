#!/usr/bin/env bash
# Análise estática — Semgrep + PHP / JS/TS.
# Uso: check-inbox.sh <arquivo>
#      ~/.cursor/review-check.sh .cursor/review/inbox/foo.php
set -euo pipefail

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

resolve_hostdime_ia_root() {
  if [[ -n "${HOSTDIME_IA_ROOT:-}" && -d "$HOSTDIME_IA_ROOT" ]]; then
    printf '%s' "$HOSTDIME_IA_ROOT"
    return
  fi
  if [[ -f "${HOME}/.cursor/hostdime-ia.env" ]]; then
    # shellcheck disable=SC1091
    source "${HOME}/.cursor/hostdime-ia.env"
    if [[ -n "${HOSTDIME_IA_ROOT:-}" && -d "$HOSTDIME_IA_ROOT" ]]; then
      printf '%s' "$HOSTDIME_IA_ROOT"
      return
    fi
  fi
  printf '%s' "$(cd "$TOOLS_DIR/../../../.." && pwd)"
}

HOSTDIME_IA_ROOT="$(resolve_hostdime_ia_root)"
TARGET="${1:-}"
FAILED=0
CI_MODE="${REVIEW_CHECK_CI:-0}"

load_node() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm use 20 >/dev/null 2>&1 || nvm use default >/dev/null 2>&1 || true
  fi
}

require_node() {
  load_node
  local major
  major="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
  if [[ "$major" -lt 20 ]]; then
    echo "Erro: Node 20+ necessário (atual: $(node -v 2>/dev/null || echo '?'))." >&2
    echo "Rode: nvm install 20 && nvm use 20" >&2
    exit 1
  fi
}

resolve_review_dirs() {
  local file="$1"
  if [[ "$file" == *"/.cursor/review/inbox/"* ]]; then
    PROJECT_ROOT="${file%%/.cursor/review/*}"
    INBOX="$PROJECT_ROOT/.cursor/review/inbox"
    return
  fi
  if [[ -n "${CURSOR_PROJECT_DIR:-}" && -d "${CURSOR_PROJECT_DIR}/.cursor/review/inbox" ]]; then
    PROJECT_ROOT="$CURSOR_PROJECT_DIR"
    INBOX="$PROJECT_ROOT/.cursor/review/inbox"
    return
  fi
  PROJECT_ROOT=""
  INBOX=""
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

  echo "Erro: informe o caminho do arquivo a revisar." >&2
  exit 1
}

run_block() {
  local title="$1"
  shift
  echo ""
  echo "=== $title ==="
  local output
  local status=0
  output="$("$@" 2>&1)" || status=$?
  if [[ -n "$output" ]]; then
    printf '%s\n' "$output"
  elif [[ $status -eq 0 ]]; then
    echo "(sem achados)"
  else
    echo "(execução retornou código $status, sem saída)"
  fi
  if [[ $status -ne 0 && "$CI_MODE" == "1" ]]; then
    FAILED=$((FAILED + 1))
  fi
}

TARGET="$(resolve_target)"
resolve_review_dirs "$TARGET"
EXT="${TARGET##*.}"
EXT_LOWER="$(printf '%s' "$EXT" | tr '[:upper:]' '[:lower:]')"

echo "Arquivo: $TARGET"
echo "Extensão: .$EXT_LOWER"
load_node
echo "Node: $(node -v 2>/dev/null || echo 'não encontrado')"

if command -v semgrep >/dev/null 2>&1; then
  run_block "Semgrep (auto)" semgrep --config auto --no-rewrite-rule-ids --quiet "$TARGET"
else
  echo ""
  echo "=== Semgrep ==="
  echo "(não instalado — pip install semgrep)"
fi

case "$EXT_LOWER" in
  php)
    run_block "PHP sintaxe (php -l)" php -l "$TARGET"
    PHPSTAN_BIN=""
    if [[ -x "$HOSTDIME_IA_ROOT/vendor/bin/phpstan" ]]; then
      PHPSTAN_BIN="$HOSTDIME_IA_ROOT/vendor/bin/phpstan"
    elif command -v phpstan >/dev/null 2>&1; then
      PHPSTAN_BIN="phpstan"
    fi
    if [[ -n "$PHPSTAN_BIN" ]]; then
      run_block "PHPStan" "$PHPSTAN_BIN" analyse \
        --configuration="$TOOLS_DIR/../conf/phpstan-inbox.neon" \
        --no-progress \
        --error-format=table \
        "$TARGET"
    else
      echo ""
      echo "=== PHPStan ==="
      echo "(rode npm run setup na raiz do hostdime-ia)"
    fi
    ;;
esac

case "$EXT_LOWER" in
  js|mjs|cjs|jsx|ts|tsx)
    require_node
    if [[ ! -x "$HOSTDIME_IA_ROOT/node_modules/.bin/eslint" ]]; then
      echo ""
      echo "=== JS/TS ==="
      echo "(rode npm run setup na raiz do hostdime-ia)"
      exit 0
    fi

    if [[ "$EXT_LOWER" == "js" || "$EXT_LOWER" == "mjs" || "$EXT_LOWER" == "cjs" || "$EXT_LOWER" == "jsx" ]]; then
      run_block "JS sintaxe (node --check)" node --check "$TARGET"
    fi

    run_block "ESLint" "$HOSTDIME_IA_ROOT/node_modules/.bin/eslint" \
      -c "$TOOLS_DIR/../mjs/eslint-inbox.mjs" \
      --no-error-on-unmatched-pattern \
      "$TARGET"

    if [[ "$EXT_LOWER" == "ts" || "$EXT_LOWER" == "tsx" ]]; then
      run_block "TypeScript (tsc --noEmit)" "$HOSTDIME_IA_ROOT/node_modules/.bin/tsc" \
        --noEmit \
        --strict \
        --target ES2022 \
        --module ESNext \
        --moduleResolution bundler \
        --jsx react-jsx \
        --esModuleInterop \
        --skipLibCheck \
        --isolatedModules \
        "$TARGET"
    fi
    ;;
esac

case "$EXT_LOWER" in
  php|js|mjs|cjs|jsx|ts|tsx) ;;
  *)
    if ! command -v semgrep >/dev/null 2>&1; then
      echo ""
      echo "Nenhum linter específico para .$EXT_LOWER (instale Semgrep ou informe a stack no /avaliar)."
    fi
    ;;
esac

if [[ "$CI_MODE" == "1" && "$FAILED" -gt 0 ]]; then
  echo ""
  echo "=== CI: $FAILED ferramenta(s) com achados ===" >&2
  exit 1
fi

echo ""
echo "=== Fim ==="
