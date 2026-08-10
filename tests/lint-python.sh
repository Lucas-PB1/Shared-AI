#!/usr/bin/env bash
# py_compile dos tools Python do code-review (smoke de sintaxe).
# Uso: npm run lint:python
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Preferir arquivos no git; sempre unir com find (worktree suja / pré-commit).
declare -A seen=()
files=()
while IFS= read -r f; do
  [[ -n "$f" ]] || continue
  [[ -n "${seen[$f]:-}" ]] && continue
  seen[$f]=1
  files+=("$f")
done < <(
  { git ls-files 'packages/code-review/tools/**/*.py' 'packages/code-review/tools/*.py' 2>/dev/null
    find packages/code-review/tools -name '*.py' -type f ! -path '*/__pycache__/*'
  } | sort -u
)

if [[ "${#files[@]}" -eq 0 ]]; then
  echo "Nenhum .py em packages/code-review/tools"
  exit 1
fi

printf 'py_compile — %d arquivo(s)\n' "${#files[@]}"
python3 -m py_compile "${files[@]}"
echo "py_compile: OK"
