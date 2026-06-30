#!/usr/bin/env bash
# Valida pré-requisitos do code review.
set -euo pipefail

warn=0

check() {
  if command -v "$2" >/dev/null 2>&1; then
    echo "✓ $1"
  else
    echo "✗ $1 ($2)"
    warn=$((warn + 1))
  fi
}

echo "Code review — doctor"
echo ""

check "Node.js" node
check "npm" npm
check "PHP" php
check "Composer" composer
check "Semgrep" semgrep

if [[ -f "${HOME}/.cursor/hostdime-ia.env" ]]; then
  # shellcheck disable=SC1091
  source "${HOME}/.cursor/hostdime-ia.env"
  echo "✓ hostdime-ia.env → $HOSTDIME_IA_ROOT"
  if [[ -d "${HOSTDIME_IA_ROOT}/node_modules" ]]; then
    echo "✓ node_modules (hostdime-ia)"
  else
    echo "✗ node_modules — rode npm run setup em hostdime-ia"
    warn=$((warn + 1))
  fi
  if [[ -x "${HOSTDIME_IA_ROOT}/vendor/bin/phpstan" ]]; then
    echo "✓ PHPStan (hostdime-ia)"
  else
    echo "✗ PHPStan — rode npm run setup em hostdime-ia"
    warn=$((warn + 1))
  fi
else
  echo "✗ hostdime-ia.env — rode npm run setup"
  warn=$((warn + 1))
fi

if [[ -x "${HOME}/.cursor/link-project.sh" ]]; then
  echo "✓ link-project.sh"
else
  echo "✗ link-project.sh — rode npm run setup"
  warn=$((warn + 1))
fi

if [[ -f "${HOME}/.cursor/commands/avaliar.md" ]]; then
  echo "✓ commands /avaliar, /finalizar"
else
  echo "✗ commands — rode npm run setup"
  warn=$((warn + 1))
fi

echo ""
[[ "$warn" -eq 0 ]] && echo "Tudo ok." || echo "$warn pendência(s)."
