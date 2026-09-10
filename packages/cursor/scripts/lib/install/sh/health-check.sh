#!/usr/bin/env bash
# Verificações de saúde por projeto registrado.
#
# Source: source .../health-check.sh
#         health_check_project /caminho/repo

health_detect_profile_label() {
  local project="$1"
  local f base

  for f in "$project/.cursor/rules"/*-project.mdc; do
    [[ -f "$f" ]] || continue
    base="$(basename "$f" .mdc)"
    echo "${base%-project}"
    return 0
  done

  if [[ -f "$project/.cursor/SKILLS-ROUTING.md" ]]; then
    echo "custom"
    return 0
  fi

  echo "—"
}

health_count_broken_rule_symlinks() {
  local project="$1"
  local broken=0 f

  [[ -d "$project/.cursor/rules" ]] || {
    echo 0
    return
  }

  for f in "$project/.cursor/rules"/*; do
    [[ -L "$f" && ! -e "$f" ]] && broken=$((broken + 1))
  done
  echo "$broken"
}

health_git_summary() {
  local project="$1"

  if ! git -C "$project" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "no-git"
    return
  fi

  local branch dirty behind=""
  branch="$(git -C "$project" branch --show-current 2>/dev/null || echo "?")"
  dirty="$(git -C "$project" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"

  if git -C "$project" rev-parse '@{upstream}' >/dev/null 2>&1; then
    behind="$(git -C "$project" rev-list --count HEAD.."@{upstream}" 2>/dev/null || echo 0)"
  fi

  echo "${branch}|${dirty}|${behind}"
}

health_check_project() {
  local project="$1"
  local issues=0
  local broken profile git_line branch dirty behind

  echo "── $(basename "$project")"
  echo "   $project"

  if [[ ! -d "$project" ]]; then
    echo "   ✗ diretório inexistente"
    return 1
  fi

  broken="$(health_count_broken_rule_symlinks "$project")"
  if [[ "$broken" -gt 0 ]]; then
    echo "   ✗ $broken symlink(s) quebrado(s) em .cursor/rules/"
    issues=$((issues + 1))
  else
    echo "   ✓ rules do projeto ok"
  fi

  profile="$(health_detect_profile_label "$project")"
  echo "   · perfil: $profile"

  git_line="$(health_git_summary "$project")"
  if [[ "$git_line" == "no-git" ]]; then
    echo "   · git: não é repositório"
  else
    IFS='|' read -r branch dirty behind <<<"$git_line"
    if [[ "$dirty" -gt 0 ]]; then
      echo "   ⚠ git dirty ($dirty arquivo(s)) — branch $branch"
      issues=$((issues + 1))
    else
      echo "   ✓ git limpo — branch $branch"
    fi
    if [[ -n "$behind" && "$behind" != "0" ]]; then
      echo "   ⚠ $behind commit(s) atrás do upstream"
      issues=$((issues + 1))
    fi
  fi

  return "$issues"
}
