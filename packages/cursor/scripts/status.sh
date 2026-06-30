#!/usr/bin/env bash
# Status do hostdime-ia: versão, projetos, symlinks, conflitos.
# Uso: npm run status
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
ENV_FILE="$CURSOR_DIR/hostdime-ia.env"
LIB="$SCRIPT_DIR/lib/link-from-repo.sh"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/hostdime-env.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/projects-registry.sh"
# shellcheck disable=SC1091
source "$LIB"

issues=0

echo "HostDime IA — status"
echo ""

if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ Não instalado — rode npm run setup:skills"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"
root="${HOSTDIME_IA_ROOT:-}"

if [[ ! -d "$root" ]]; then
  echo "✗ Clone não encontrado: $root"
  issues=$((issues + 1))
else
  current="$(hostdime_read_version "$root")"
  installed="${HOSTDIME_IA_VERSION:-?}"
  echo "Clone:     $root"
  echo "Versão:    clone=$current  instalada=$installed"
  if [[ "$current" != "$installed" ]]; then
    echo "⚠ Desatualizado — git pull && npm run sync"
    issues=$((issues + 1))
  else
    echo "✓ Versão em dia"
  fi
  echo "Último sync: ${HOSTDIME_IA_LAST_SYNC:-?}"
fi

echo ""
echo "=== ~/.cursor/ (usuário) ==="
export HOSTDIME_IA_ROOT="$root"
reset_link_counters
LINK_REPORT_FILE="$(mktemp)"
export LINK_REPORT_FILE

check_user_link() {
  local src="$1"
  local dest="$2"
  if [[ -e "$dest" && ! -L "$dest" ]]; then
    echo "  pulado: $dest (arquivo real)"
    issues=$((issues + 1))
  elif [[ -L "$dest" && ! -e "$dest" ]]; then
    echo "  quebrado: $dest"
    issues=$((issues + 1))
  elif [[ -L "$dest" ]]; then
    echo "  ok: $(basename "$dest")"
  elif [[ -f "$src" || -d "$src" ]]; then
    echo "  ausente: $dest"
    issues=$((issues + 1))
  fi
}

if [[ -d "$root" ]]; then
  f=""
  skill=""
  for f in "$root/packages/cursor/rules"/skills-orchestrator-*.mdc; do
    [[ -f "$f" ]] || continue
    check_user_link "$f" "$CURSOR_DIR/rules/$(basename "$f")"
  done
  for skill in "$root/packages/cursor/skills"/*/ "$root/packages/code-review/skills"/*/; do
    [[ -d "$skill" ]] || continue
    check_user_link "$skill" "$CURSOR_DIR/skills/$(basename "$skill")"
  done
  check_user_link "$root/packages/code-review/commands/avaliar.md" "$CURSOR_DIR/commands/avaliar.md"
  check_user_link "$root/packages/code-review/commands/finalizar.md" "$CURSOR_DIR/commands/finalizar.md"
  check_user_link "$root/packages/code-review/commands/avaliar-diff.md" "$CURSOR_DIR/commands/avaliar-diff.md"
fi

rm -f "$LINK_REPORT_FILE"

echo ""
echo "=== Projetos registrados ==="
_registry_ensure
prune_missing_projects
project_count=0
while IFS= read -r project; do
  [[ -n "$project" ]] || continue
  project_count=$((project_count + 1))
  if [[ ! -d "$project" ]]; then
    echo "  ✗ $project (não existe)"
    issues=$((issues + 1))
    continue
  fi
  broken=0
  skipped=0
  for f in "$project/.cursor/rules"/*; do
    [[ -e "$f" || -L "$f" ]] || continue
    if [[ -e "$f" && ! -L "$f" ]]; then
      skipped=$((skipped + 1))
    elif [[ -L "$f" && ! -e "$f" ]]; then
      broken=$((broken + 1))
    fi
  done
  if [[ "$broken" -gt 0 ]]; then
    echo "  ⚠ $project ($broken symlink(s) quebrado(s))"
    issues=$((issues + 1))
  elif [[ "$skipped" -gt 0 ]]; then
    echo "  ✓ $project ($skipped rule(s) própria(s) preservada(s))"
  else
    echo "  ✓ $project"
  fi
done < <(list_projects)

[[ "$project_count" -eq 0 ]] && echo "  (nenhum — use npm run bootstrap -- <repo>)"

echo ""
if [[ "$issues" -eq 0 ]]; then
  echo "Resumo: OK"
  exit 0
else
  echo "Resumo: $issues item(ns) pendente(s)"
  exit 0
fi
