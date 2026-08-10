#!/usr/bin/env bash
# py_compile dos tools Python do code-review (smoke de sintaxe).
# Uso: npm run lint:python
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mapfile -t files < <(git ls-files 'packages/code-review/tools/*.py')
if [[ "${#files[@]}" -eq 0 ]]; then
  # fallback se git ls-files vazio (worktree estranho)
  mapfile -t files < <(find packages/code-review/tools -maxdepth 1 -name '*.py' -type f | sort)
fi

if [[ "${#files[@]}" -eq 0 ]]; then
  echo "Nenhum .py em packages/code-review/tools"
  exit 1
fi

printf 'py_compile — %d arquivo(s)\n' "${#files[@]}"
python3 -m py_compile "${files[@]}"
echo "py_compile: OK"
