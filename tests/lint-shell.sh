#!/usr/bin/env bash
# ShellCheck local — mesmo critério do job CI (severity=error).
# Uso: npm run lint:shell
# Se shellcheck não estiver instalado, imprime como instalar e sai 0 (não bloqueia dev sem tool).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v shellcheck >/dev/null 2>&1; then
  cat <<'EOF' >&2
shellcheck não encontrado no PATH.

Instale para reproduzir o job CI localmente:
  # Debian/Ubuntu
  sudo apt install shellcheck
  # macOS
  brew install shellcheck

Depois: npm run lint:shell
EOF
  exit 0
fi

mapfile -t files < <(git ls-files '*.sh')
if [[ "${#files[@]}" -eq 0 ]]; then
  echo "Nenhum *.sh versionado."
  exit 0
fi

printf 'ShellCheck — %d script(s)\n' "${#files[@]}"
shellcheck -x --severity=error "${files[@]}"
echo "ShellCheck: OK"
