#!/usr/bin/env bash
# Sincroniza após git pull: symlinks, deps, relink de todos os projetos.
# Uso: npm run sync [-- --prune]
set -euo pipefail

PRUNE=0
MIGRATE=0
for arg in "$@"; do
  [[ "$arg" == "--prune" ]] && PRUNE=1
  [[ "$arg" == "--migrate" ]] && MIGRATE=1
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
LINK_SCRIPT="$CURSOR_DIR/link-project.sh"
STATE_FILE="$CURSOR_DIR/shared-ai/sync-state.env"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/install-packages.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/shared-ai-env.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/projects-registry.sh"

echo "Shared AI — sync"
echo "Clone: $MONOREPO_ROOT"
echo ""

if [[ "$MIGRATE" -eq 1 ]]; then
  migrate_managed_real_files "$MONOREPO_ROOT"
fi

install_skills_package "$MONOREPO_ROOT"

if [[ "$PRUNE" -eq 1 ]]; then
  echo "→ prune symlinks órfãos"
  prune_user_symlinks_if_requested "$MONOREPO_ROOT"
fi

needs_npm=0
mkdir -p "$(dirname "$STATE_FILE")"

pkg_hash=""
if [[ -f "$MONOREPO_ROOT/package-lock.json" ]]; then
  pkg_hash="$(md5sum "$MONOREPO_ROOT/package-lock.json" | awk '{print $1}')"
fi

prev_pkg=""
if [[ -f "$STATE_FILE" ]]; then
  prev_pkg="$(grep '^PACKAGE_LOCK_HASH=' "$STATE_FILE" 2>/dev/null | cut -d= -f2- || true)"
fi

if [[ -n "$pkg_hash" && "$pkg_hash" != "$prev_pkg" ]]; then
  needs_npm=1
  echo "package-lock.json alterado — npm install"
fi

if [[ "$needs_npm" -eq 1 ]]; then
  (cd "$MONOREPO_ROOT" && npm install)
fi

{
  [[ -n "$pkg_hash" ]] && echo "PACKAGE_LOCK_HASH=$pkg_hash"
} >"$STATE_FILE"

shared_ai_update_sync_time

prune_missing_projects

echo ""
echo "→ relink projetos registrados"
if [[ -x "$LINK_SCRIPT" ]]; then
  while IFS= read -r project; do
    [[ -n "$project" && -d "$project" ]] || continue
    echo "  $project"
    "$LINK_SCRIPT" --quiet "$project" || true
  done < <(list_projects)
fi

echo ""
echo "Sync concluído."

# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/boot-sync.sh"
boot_sync_prompt_if_needed
