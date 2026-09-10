#!/usr/bin/env bash
# Instala symlinks do shared-ai em ~/.cursor/

install_skills_package() {
  local monorepo_root="$1"
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  local cursor_pkg="$monorepo_root/packages/cursor"
  local install_lib="$cursor_pkg/scripts/lib/install/sh"
  local sync_lib="$cursor_pkg/scripts/lib/sync-inbox/sh"

  # shellcheck disable=SC1091
  source "$install_lib/link-from-repo.sh"
  # shellcheck disable=SC1091
  source "$install_lib/shared-ai-env.sh"

  export SHARED_AI_ROOT="$monorepo_root"
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
  install -m 755 "$cursor_pkg/scripts/sh/link-project.sh" "$cursor_dir/"
  install -m 755 "$cursor_pkg/scripts/sh/link-project-rules.sh" "$cursor_dir/"
  install -m 755 "$cursor_pkg/scripts/hooks/sh/ensure-project-cursor.sh" "$cursor_dir/hooks/"
  install -m 755 "$cursor_dir/hooks/ensure-project-cursor.sh" "$cursor_dir/hooks/ensure-project-rules.sh"
  install -m 755 "$install_lib/projects-registry.sh" "$cursor_dir/shared-ai-projects-registry.sh"
  install -m 755 "$install_lib/shared-ai-env.sh" "$cursor_dir/shared-ai-env.sh"
  install -m 755 "$install_lib/link-from-repo.sh" "$cursor_dir/shared-ai-link-from-repo.sh"
  install -m 755 "$cursor_pkg/scripts/sh/install-cursor-cli.sh" "$cursor_dir/"
  install -m 755 "$cursor_pkg/scripts/sh/agent-cli.sh" "$cursor_dir/run-agent.sh"
  install -m 755 "$install_lib/cursor-cli.sh" "$cursor_dir/shared-ai-cursor-cli.sh"
  install -m 755 "$sync_lib/sync-inbox.sh" "$cursor_dir/shared-ai-sync-inbox.sh"
  install -m 755 "$cursor_pkg/scripts/sh/sync-inbox.sh" "$cursor_dir/"

  shared_ai_write_env "$monorepo_root"

  echo "  symlinks: $LINK_LINKED ok, $LINK_SKIPPED pulados"

  # shellcheck disable=SC1091
  source "$install_lib/merge-hooks-json.sh"
  merge_shared_ai_hooks_json "$cursor_pkg"
}

migrate_managed_real_files() {
  local monorepo_root="$1"
  local cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  local cursor_pkg="$monorepo_root/packages/cursor"
  local f d dest name

  echo "→ migrate (substituir cópias antigas por symlinks)"
  for f in "$cursor_pkg/rules"/skills-orchestrator-*.mdc; do
    [[ -f "$f" ]] || continue
    dest="$cursor_dir/rules/$(basename "$f")"
    [[ -e "$dest" && ! -L "$dest" ]] && rm -f "$dest"
  done
  for cmd in skills-why.md cursor-cli.md historico.md sync-inbox.md onboard.md; do
    dest="$cursor_dir/commands/$cmd"
    [[ -e "$dest" && ! -L "$dest" ]] && rm -f "$dest"
  done
  for d in "$cursor_pkg/skills"/*/; do
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
  local lib_dir="$cursor_pkg/scripts/lib/install/sh"
  local names=() d f

  # shellcheck disable=SC1091
  source "$lib_dir/link-from-repo.sh"
  export SHARED_AI_ROOT="$monorepo_root"

  for f in "$cursor_pkg/rules"/skills-orchestrator-*.mdc; do
    [[ -f "$f" ]] && names+=("$(basename "$f")")
  done
  prune_managed_symlinks "$cursor_dir/rules" "${names[@]}"

  names=()
  for d in "$cursor_pkg/skills"/*/; do
    [[ -d "$d" ]] && names+=("$(basename "$d")")
  done
  prune_managed_symlinks "$cursor_dir/skills" "${names[@]}"

  names=(skills-why.md cursor-cli.md historico.md sync-inbox.md onboard.md)
  prune_managed_symlinks "$cursor_dir/commands" "${names[@]}"
}
