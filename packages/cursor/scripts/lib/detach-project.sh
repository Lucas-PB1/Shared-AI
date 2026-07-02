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
  local f cmd name

  [[ -d "$project" ]] || {
    echo "Erro: projeto não encontrado: $project" >&2
    return 1
  }

  if [[ -z "$root" || ! -d "$root" ]]; then
    echo "Erro: HOSTDIME_IA_ROOT não configurado" >&2
    return 1
  fi

  # shellcheck disable=SC1091
  source "$root/packages/cursor/scripts/lib/link-from-repo.sh"
  export HOSTDIME_IA_ROOT="$root"

  echo "→ removendo symlinks gerenciados em $project"

  if [[ -d "$rules_dir" ]]; then
    shopt -s nullglob
    for f in "$rules_dir"/skills-orchestrator-*.mdc; do
      [[ -L "$f" ]] || continue
      if is_hostdime_symlink "$f"; then
        name="$(basename "$f")"
        rm -f "$f"
        echo "  removido: .cursor/rules/$name"
        removed=$((removed + 1))
      fi
    done
    shopt -u nullglob
  fi

  if [[ -d "$commands_dir" ]]; then
    for cmd in avaliar.md finalizar.md avaliar-diff.md skills-why.md hubspot-mcp.md; do
      f="$commands_dir/$cmd"
      [[ -L "$f" ]] || continue
      if is_hostdime_symlink "$f"; then
        rm -f "$f"
        echo "  removido: .cursor/commands/$cmd"
        removed=$((removed + 1))
      fi
    done
  fi

  if [[ "$removed" -eq 0 ]]; then
    echo "  (nenhum symlink gerenciado encontrado)"
  else
    echo "  total: $removed symlink(s)"
  fi

  echo "  preservado: rules/commands reais, SKILLS-ROUTING.md, skills/, review/"
}
