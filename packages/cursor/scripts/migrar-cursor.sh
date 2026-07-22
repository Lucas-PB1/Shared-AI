#!/usr/bin/env bash
# Migração one-shot da máquina: sync + limpa espelhos e ignores órfãos.
# Uso: npm run migrar-cursor
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
ENV_FILE="$CURSOR_DIR/hostdime-ia.env"
SYNC_SCRIPT="$SCRIPT_DIR/sync-all.sh"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

HOSTDIME_IA_ROOT="${HOSTDIME_IA_ROOT:-$MONOREPO_ROOT}"
export HOSTDIME_IA_ROOT
export CURSOR_USER_DIR="${CURSOR_USER_DIR:-$CURSOR_DIR}"

if [[ ! -d "$HOSTDIME_IA_ROOT/packages/cursor" ]]; then
  echo "Erro: clone hostdime-ia inválido: $HOSTDIME_IA_ROOT" >&2
  echo "Execute: npm run setup:skills / /onboard" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/link-from-repo.sh"
# shellcheck disable=SC1091
source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/ensure-project-gitignore.sh"
# shellcheck disable=SC1091
source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/projects-registry.sh"
export HOSTDIME_IA_ROOT

echo "HostDime IA — migrar-cursor"
echo "Clone: $HOSTDIME_IA_ROOT"
echo ""

echo "→ sync (relinka ~/.cursor + projetos registrados)"
bash "$SYNC_SCRIPT"

LINK_SCRIPT="$CURSOR_DIR/link-project.sh"
if [[ ! -x "$LINK_SCRIPT" ]]; then
  LINK_SCRIPT="$HOSTDIME_IA_ROOT/packages/cursor/scripts/link-project.sh"
fi

issues=0

count_hostdime_rule_symlinks() {
  local rules_dir="$1"
  local f n=0
  shopt -s nullglob
  for f in "$rules_dir"/skills-orchestrator-*.mdc; do
    [[ -L "$f" ]] && is_hostdime_symlink "$f" && n=$((n + 1))
  done
  shopt -u nullglob
  echo "$n"
}

count_hostdime_command_symlinks() {
  local commands_dir="$1"
  local f n=0
  shopt -s nullglob
  for f in "$commands_dir"/*.md; do
    [[ -L "$f" ]] && is_hostdime_symlink "$f" && n=$((n + 1))
  done
  shopt -u nullglob
  echo "$n"
}

clean_one_project() {
  local project="$1"
  local before_r before_c before_g after_r after_c after_g

  [[ -d "$project" ]] || return 0

  before_r="$(count_hostdime_rule_symlinks "$project/.cursor/rules")"
  before_c="$(count_hostdime_command_symlinks "$project/.cursor/commands")"
  before_g="$(count_project_gitignore_orphans "$project")"

  if [[ -x "$LINK_SCRIPT" ]]; then
    "$LINK_SCRIPT" --quiet "$project" || true
  else
    remove_project_orchestrator_rule_symlinks "$project/.cursor/rules"
    remove_project_managed_command_symlinks "$project/.cursor/commands"
    ensure_project_gitignore "$project"
  fi

  after_r="$(count_hostdime_rule_symlinks "$project/.cursor/rules")"
  after_c="$(count_hostdime_command_symlinks "$project/.cursor/commands")"
  after_g="$(count_project_gitignore_orphans "$project")"

  if [[ "$after_r" -gt 0 || "$after_c" -gt 0 || "$after_g" -gt 0 ]]; then
    echo "  ✗ $project (rules=$after_r cmds=$after_c ignores=$after_g)"
    issues=$((issues + 1))
  else
    local rem_r=$((before_r - after_r))
    local rem_c=$((before_c - after_c))
    local rem_g=$((before_g - after_g))
    echo "  ✓ $project (limpo rules=$rem_r cmds=$rem_c ignores=$rem_g)"
  fi
}

echo ""
echo "→ limpeza / verificação dos projetos"
_registry_ensure
if declare -F prune_missing_projects >/dev/null 2>&1; then
  prune_missing_projects || true
fi

projects_done=""
while IFS= read -r project; do
  [[ -n "$project" && -d "$project" ]] || continue
  projects_done="$projects_done"$'\n'"$project"
  clean_one_project "$project"
done < <(list_projects)

for extra in "$HOME/Projetos"; do
  [[ -d "$extra/.cursor" ]] || continue
  if printf '%s\n' "$projects_done" | grep -qxF "$extra"; then
    continue
  fi
  echo "  (extra) $extra"
  clean_one_project "$extra"
done

echo ""
echo "→ globais em $CURSOR_DIR"
if [[ -e "$CURSOR_DIR/rules/skills-orchestrator-base.mdc" ]]; then
  echo "  ✓ rules/skills-orchestrator-base.mdc"
else
  echo "  ✗ rules/skills-orchestrator-base.mdc ausente"
  issues=$((issues + 1))
fi
if [[ -e "$CURSOR_DIR/commands/avaliar.md" ]]; then
  echo "  ✓ commands/avaliar.md"
else
  echo "  ✗ commands/avaliar.md ausente"
  issues=$((issues + 1))
fi
if [[ -e "$CURSOR_DIR/commands/migrar-cursor.md" ]]; then
  echo "  ✓ commands/migrar-cursor.md"
else
  echo "  ⚠ commands/migrar-cursor.md ausente — rode npm run sync"
  issues=$((issues + 1))
fi

echo ""
if [[ "$issues" -eq 0 ]]; then
  echo "Migração concluída. Espelhos por projeto e ignores órfãos são lixo — se reaparecerem, rode de novo /migrar-cursor ou npm run sync. Não reintroduzir dual-link."
  exit 0
fi

echo "Migração incompleta: $issues pendência(s)." >&2
exit 1
