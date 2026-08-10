#!/usr/bin/env bash
# Remove symlinks gerenciados pelo hostdime-ia no projeto (preserva arquivos reais).
#
# Source: source .../detach-project.sh
#         detach_hostdime_from_project /caminho/repo

detach_hostdime_from_project() {
  local project="$1"
  local root="${HOSTDIME_IA_ROOT:-}"
  local rules_dir="$project/.cursor/rules"
  local commands_dir="$project/.cursor/commands"
  local removed=0

  [[ -d "$project" ]] || {
    echo "Erro: projeto não encontrado: $project" >&2
    return 1
  }

  if [[ -z "$root" || ! -d "$root" ]]; then
    echo "Erro: HOSTDIME_IA_ROOT não configurado" >&2
    return 1
  fi

  # shellcheck disable=SC1091
  source "$root/packages/cursor/scripts/lib/install/link-from-repo.sh"
  export HOSTDIME_IA_ROOT="$root"

  echo "→ removendo symlinks gerenciados em $project"

  remove_project_orchestrator_rule_symlinks "$rules_dir"
  remove_project_managed_command_symlinks "$commands_dir"
  removed=$((LINK_ORCHESTRATOR_REMOVED + LINK_COMMANDS_REMOVED))

  if [[ "$removed" -eq 0 ]]; then
    echo "  (nenhum symlink gerenciado encontrado)"
  else
    [[ "$LINK_ORCHESTRATOR_REMOVED" -gt 0 ]] && echo "  rules: $LINK_ORCHESTRATOR_REMOVED"
    [[ "$LINK_COMMANDS_REMOVED" -gt 0 ]] && echo "  commands: $LINK_COMMANDS_REMOVED"
    echo "  total: $removed symlink(s)"
  fi

  echo "  preservado: rules/commands reais, SKILLS-ROUTING.md, skills/, review/"
}
