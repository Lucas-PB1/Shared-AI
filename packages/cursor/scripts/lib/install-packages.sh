#!/usr/bin/env bash
# Instala symlinks do hostdime-ia em ~/.cursor/

install_skills_package() {
  local monorepo_root="$1"
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  local cursor_pkg="$monorepo_root/packages/cursor"
  local lib_dir="$cursor_pkg/scripts/lib"

  # shellcheck disable=SC1091
  source "$lib_dir/link-from-repo.sh"
  # shellcheck disable=SC1091
  source "$lib_dir/hostdime-env.sh"

  export HOSTDIME_IA_ROOT="$monorepo_root"
  reset_link_counters

  mkdir -p "$cursor_dir"/{rules,skills,hooks}

  echo "→ rules (orquestrador)"
  local rule_file rule_dest
  for rule_file in "$cursor_pkg/rules"/skills-orchestrator-*.mdc; do
    [[ -f "$rule_file" ]] || continue
    rule_dest="$cursor_dir/rules/$(basename "$rule_file")"
    if [[ -e "$rule_dest" && ! -L "$rule_dest" ]]; then
      rm -f "$rule_dest"
    fi
  done
  link_glob "$cursor_pkg/rules/skills-orchestrator-*.mdc" "$cursor_dir/rules"

  if [[ -d "$cursor_pkg/commands" ]]; then
    echo "→ commands (cursor)"
    link_glob "$cursor_pkg/commands/*.md" "$cursor_dir/commands"
  fi

  echo "→ skills (cursor)"
  local skill_dir
  for skill_dir in "$cursor_pkg/skills"/*/; do
    [[ -d "$skill_dir" ]] || continue
    link_dir "$skill_dir" "$cursor_dir/skills"
  done

  echo "→ SKILLS-ROUTING.md"
  link_file "$cursor_pkg/docs/SKILLS-ROUTING.md" "$cursor_dir"

  echo "→ scripts de automação"
  install -m 755 "$cursor_pkg/scripts/link-project.sh" "$cursor_dir/"
  install -m 755 "$cursor_pkg/scripts/link-project-rules.sh" "$cursor_dir/"
  install -m 755 "$cursor_pkg/scripts/hooks/ensure-project-cursor.sh" "$cursor_dir/hooks/"
  install -m 755 "$cursor_dir/hooks/ensure-project-cursor.sh" "$cursor_dir/hooks/ensure-project-rules.sh"
  install -m 755 "$lib_dir/projects-registry.sh" "$cursor_dir/hostdime-projects-registry.sh"
  install -m 755 "$lib_dir/hostdime-env.sh" "$cursor_dir/hostdime-env.sh"
  install -m 755 "$lib_dir/link-from-repo.sh" "$cursor_dir/hostdime-link-from-repo.sh"
  install -m 755 "$cursor_pkg/scripts/install-hubspot-mcp.sh" "$cursor_dir/"
  install -m 755 "$cursor_pkg/scripts/install-cursor-cli.sh" "$cursor_dir/"
  install -m 755 "$cursor_pkg/scripts/agent-cli.sh" "$cursor_dir/run-agent.sh"
  install -m 755 "$lib_dir/cursor-cli.sh" "$cursor_dir/hostdime-cursor-cli.sh"
  install -m 755 "$lib_dir/sync-inbox.sh" "$cursor_dir/hostdime-sync-inbox.sh"
  install -m 755 "$cursor_pkg/scripts/sync-inbox.sh" "$cursor_dir/"

  hostdime_write_env "$monorepo_root"

  echo "  symlinks: $LINK_LINKED ok, $LINK_SKIPPED pulados"

  # shellcheck disable=SC1091
  source "$lib_dir/merge-hooks-json.sh"
  merge_hostdime_hooks_json "$cursor_pkg"
}

install_code_review_package() {
  local monorepo_root="$1"
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  local review_pkg="$monorepo_root/packages/code-review"
  local lib_dir="$monorepo_root/packages/cursor/scripts/lib"

  # shellcheck disable=SC1091
  source "$lib_dir/link-from-repo.sh"
  # shellcheck disable=SC1091
  source "$lib_dir/hostdime-env.sh"

  export HOSTDIME_IA_ROOT="$monorepo_root"
  reset_link_counters

  mkdir -p "$cursor_dir"/{skills,commands}

  echo "→ skills (review)"
  local skill_dir
  for skill_dir in "$review_pkg/skills"/*/; do
    [[ -d "$skill_dir" ]] || continue
    link_dir "$skill_dir" "$cursor_dir/skills"
  done

  echo "→ commands (/avaliar, /finalizar, /memoria)"
  for cmd in avaliar.md finalizar.md avaliar-diff.md memoria.md skills-why.md hubspot-mcp.md; do
    if [[ -e "$cursor_dir/commands/$cmd" && ! -L "$cursor_dir/commands/$cmd" ]]; then
      rm -f "$cursor_dir/commands/$cmd"
    fi
  done
  link_file "$review_pkg/commands/avaliar.md" "$cursor_dir/commands"
  link_file "$review_pkg/commands/finalizar.md" "$cursor_dir/commands"
  link_file "$review_pkg/commands/avaliar-diff.md" "$cursor_dir/commands"
  link_file "$review_pkg/commands/memoria.md" "$cursor_dir/commands"

  echo "→ ferramentas review"
  install -m 755 "$review_pkg/tools/check-inbox.sh" "$cursor_dir/review-check.sh"
  install -m 755 "$review_pkg/tools/finalizar-review.sh" "$cursor_dir/review-finalizar.sh"
  install -m 755 "$review_pkg/tools/review-diff.sh" "$cursor_dir/review-diff.sh"
  install -m 755 "$review_pkg/tools/review-ci.sh" "$cursor_dir/review-ci.sh"
  install -m 755 "$review_pkg/tools/review-memoria.sh" "$cursor_dir/review-memoria.sh"

  if [[ -f "$cursor_dir/hostdime-ia.env" ]]; then
    hostdime_update_sync_time
  else
    hostdime_write_env "$monorepo_root"
  fi

  echo "  symlinks: $LINK_LINKED ok, $LINK_SKIPPED pulados"
}

migrate_managed_real_files() {
  local monorepo_root="$1"
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  local cursor_pkg="$monorepo_root/packages/cursor"
  local review_pkg="$monorepo_root/packages/code-review"
  local f d dest name

  echo "→ migrate (substituir cópias antigas por symlinks)"
  for f in "$cursor_pkg/rules"/skills-orchestrator-*.mdc; do
    [[ -f "$f" ]] || continue
    dest="$cursor_dir/rules/$(basename "$f")"
    [[ -e "$dest" && ! -L "$dest" ]] && rm -f "$dest"
  done
  for cmd in avaliar.md finalizar.md avaliar-diff.md memoria.md skills-why.md hubspot-mcp.md; do
    dest="$cursor_dir/commands/$cmd"
    [[ -e "$dest" && ! -L "$dest" ]] && rm -f "$dest"
  done
  for d in "$cursor_pkg/skills"/*/ "$review_pkg/skills"/*/; do
    [[ -d "$d" ]] || continue
    name="$(basename "$d")"
    dest="$cursor_dir/skills/$name"
    [[ -e "$dest" && ! -L "$dest" ]] && rm -rf "$dest"
  done
  if [[ -f "$cursor_dir/SKILLS-ROUTING.md" && ! -L "$cursor_dir/SKILLS-ROUTING.md" ]]; then
    rm -f "$cursor_dir/SKILLS-ROUTING.md"
  fi
}

prune_user_symlinks_if_requested() {
  local monorepo_root="$1"
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  local cursor_pkg="$monorepo_root/packages/cursor"
  local review_pkg="$monorepo_root/packages/code-review"
  local lib_dir="$cursor_pkg/scripts/lib"
  local names=() d f

  # shellcheck disable=SC1091
  source "$lib_dir/link-from-repo.sh"
  export HOSTDIME_IA_ROOT="$monorepo_root"

  for f in "$cursor_pkg/rules"/skills-orchestrator-*.mdc; do
    [[ -f "$f" ]] && names+=("$(basename "$f")")
  done
  prune_managed_symlinks "$cursor_dir/rules" "${names[@]}"

  names=()
  for d in "$cursor_pkg/skills"/*/ "$review_pkg/skills"/*/; do
    [[ -d "$d" ]] && names+=("$(basename "$d")")
  done
  prune_managed_symlinks "$cursor_dir/skills" "${names[@]}"

  names=(avaliar.md finalizar.md avaliar-diff.md memoria.md skills-why.md hubspot-mcp.md)
  prune_managed_symlinks "$cursor_dir/commands" "${names[@]}"
}
