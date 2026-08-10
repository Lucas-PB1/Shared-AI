#!/usr/bin/env bash
# Helpers para symlink seguro (nunca sobrescreve arquivo real).
# Source: source "$(dirname "$0")/lib/link-from-repo.sh"

LINK_LINKED=0
LINK_SKIPPED=0
LINK_BROKEN=0
LINK_REPORT_FILE="${LINK_REPORT_FILE:-}"

_link_report() {
  local kind="$1"
  local msg="$2"
  if [[ -n "${LINK_REPORT_FILE:-}" ]]; then
    echo "$kind|$msg" >>"$LINK_REPORT_FILE"
  fi
  return 0
}

_link_abs() {
  readlink -f "$1" 2>/dev/null || printf '%s' "$1"
}

# Symlink aponta para dentro do clone hostdime-ia?
is_hostdime_symlink() {
  local path="$1"
  local root="${HOSTDIME_IA_ROOT:-}"
  [[ -L "$path" && -n "$root" ]] || return 1
  local target
  target="$(_link_abs "$path")"
  [[ "$target" == "$root"* ]]
}

link_file() {
  local src="$1"
  local dest_dir="$2"
  local name dest current target_path

  [[ -f "$src" ]] || return 0

  name="$(basename "$src")"
  dest="$dest_dir/$name"

  if [[ -e "$dest" && ! -L "$dest" ]]; then
    LINK_SKIPPED=$((LINK_SKIPPED + 1))
    _link_report "skipped" "$dest (arquivo real — não sobrescrito)"
    return 0
  fi

  if [[ -L "$dest" && ! -e "$dest" ]]; then
    LINK_BROKEN=$((LINK_BROKEN + 1))
    _link_report "broken" "$dest"
  fi

  current="$(_link_abs "$dest" 2>/dev/null || true)"
  target_path="$(_link_abs "$src")"
  if [[ -L "$dest" && "$current" == "$target_path" ]]; then
    local literal_target
    literal_target="$(readlink "$dest" 2>/dev/null || true)"
    if [[ "$literal_target" == "$src" || "$literal_target" == "$target_path" ]]; then
      return 0
    fi
  elif [[ "$current" == "$target_path" ]]; then
    return 0
  fi

  mkdir -p "$dest_dir"
  ln -sf "$src" "$dest"
  LINK_LINKED=$((LINK_LINKED + 1))
  _link_report "linked" "$dest -> $src"
}

link_dir() {
  local src="$1"
  local dest_dir="$2"
  local name dest current target_path

  [[ -d "$src" ]] || return 0

  name="$(basename "$src")"
  dest="$dest_dir/$name"

  if [[ -e "$dest" && ! -L "$dest" ]]; then
    LINK_SKIPPED=$((LINK_SKIPPED + 1))
    _link_report "skipped" "$dest (pasta real — não sobrescrito)"
    return 0
  fi

  if [[ -L "$dest" && ! -e "$dest" ]]; then
    LINK_BROKEN=$((LINK_BROKEN + 1))
    _link_report "broken" "$dest"
  fi

  current="$(_link_abs "$dest" 2>/dev/null || true)"
  target_path="$(_link_abs "$src")"
  if [[ -L "$dest" && "$current" == "$target_path" ]]; then
    local literal_target
    literal_target="$(readlink "$dest" 2>/dev/null || true)"
    if [[ "$literal_target" == "$src" || "$literal_target" == "$target_path" ]]; then
      return 0
    fi
  elif [[ "$current" == "$target_path" ]]; then
    return 0
  fi

  mkdir -p "$dest_dir"
  ln -sf "$src" "$dest"
  LINK_LINKED=$((LINK_LINKED + 1))
  _link_report "linked" "$dest -> $src"
}

link_glob() {
  local pattern="$1"
  local dest_dir="$2"
  local dir glob f
  # Separa o diretório (mantido entre aspas p/ suportar espaços) do padrão de
  # nome de arquivo, que é o único trecho que deve sofrer expansão de glob.
  dir="${pattern%/*}"
  glob="${pattern##*/}"
  shopt -s nullglob
  for f in "$dir"/$glob; do
    if [[ -d "$f" ]]; then
      link_dir "$f" "$dest_dir"
    elif [[ -f "$f" ]]; then
      link_file "$f" "$dest_dir"
    fi
  done
  shopt -u nullglob
}

# Remove symlinks órfãos que apontavam ao clone (opt-in --prune)
prune_managed_symlinks() {
  local dir="$1"
  local managed_names=("${@:2}")
  local entry name

  [[ -d "$dir" ]] || return 0

  for entry in "$dir"/*; do
    [[ -e "$entry" || -L "$entry" ]] || continue
    name="$(basename "$entry")"
    if [[ -L "$entry" ]] && is_hostdime_symlink "$entry"; then
      local found=0 n
      for n in "${managed_names[@]}"; do
        [[ "$n" == "$name" ]] && found=1 && break
      done
      if [[ $found -eq 0 ]]; then
        rm -f "$entry"
        _link_report "pruned" "$entry"
      fi
    fi
  done
}

reset_link_counters() {
  LINK_LINKED=0
  LINK_SKIPPED=0
  LINK_BROKEN=0
  LINK_ORCHESTRATOR_REMOVED=0
  LINK_COMMANDS_REMOVED=0
}

# Remove symlinks gerenciados skills-orchestrator-*.mdc do projeto
# (orquestrador vive só em ~/.cursor/rules/ desde Cursor 2.1+).
LINK_ORCHESTRATOR_REMOVED=0
remove_project_orchestrator_rule_symlinks() {
  local rules_dir="$1"
  local f name

  LINK_ORCHESTRATOR_REMOVED=0
  [[ -d "$rules_dir" ]] || return 0

  shopt -s nullglob
  for f in "$rules_dir"/skills-orchestrator-*.mdc; do
    [[ -L "$f" ]] || continue
    if is_hostdime_symlink "$f"; then
      name="$(basename "$f")"
      rm -f "$f"
      LINK_ORCHESTRATOR_REMOVED=$((LINK_ORCHESTRATOR_REMOVED + 1))
      _link_report "removed" "$rules_dir/$name (orquestrador global)"
    fi
  done
  shopt -u nullglob
}

# Remove symlinks gerenciados de commands no projeto
# (commands hostdime vivem só em ~/.cursor/commands/).
LINK_COMMANDS_REMOVED=0
remove_project_managed_command_symlinks() {
  local commands_dir="$1"
  local f name

  LINK_COMMANDS_REMOVED=0
  [[ -d "$commands_dir" ]] || return 0

  shopt -s nullglob
  for f in "$commands_dir"/*.md; do
    [[ -L "$f" ]] || continue
    if is_hostdime_symlink "$f"; then
      name="$(basename "$f")"
      rm -f "$f"
      LINK_COMMANDS_REMOVED=$((LINK_COMMANDS_REMOVED + 1))
      _link_report "removed" "$commands_dir/$name (command global)"
    fi
  done
  shopt -u nullglob
}
