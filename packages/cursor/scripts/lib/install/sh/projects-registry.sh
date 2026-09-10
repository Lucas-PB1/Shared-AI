#!/usr/bin/env bash
# Registro de projetos ligados ao shared-ai

REGISTRY_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}/shared-ai"
REGISTRY_FILE="$REGISTRY_DIR/projects.json"

# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]}")/shared-ai-env.sh"

_registry_ts() {
  local root
  root="$(shared_ai_resolve_root 2>/dev/null || true)"
  if [[ -n "$root" && -f "$root/packages/cursor/scripts/lib/install/ts/projects-registry.ts" ]]; then
    printf '%s/packages/cursor/scripts/lib/install/ts/projects-registry.ts' "$root"
    return 0
  fi
  echo "Erro: projects-registry.ts não encontrado (SHARED_AI_ROOT?)" >&2
  return 1
}

_registry_run() {
  local ts
  ts="$(_registry_ts)" || return 1
  shared_ai_tsx "$ts" "$@"
}

_registry_ensure() {
  mkdir -p "$REGISTRY_DIR"
  if [[ ! -f "$REGISTRY_FILE" ]]; then
    echo '{"projects":[]}' >"$REGISTRY_FILE"
  fi
}

register_project() {
  local path="$1"
  _registry_ensure
  _registry_run register "$path" "$REGISTRY_FILE"
}

list_projects() {
  _registry_ensure
  _registry_run list "$REGISTRY_FILE"
}

unregister_project() {
  local path="$1"
  _registry_ensure
  _registry_run unregister "$path" "$REGISTRY_FILE"
}

prune_missing_projects() {
  _registry_ensure
  _registry_run prune "$REGISTRY_FILE"
}
