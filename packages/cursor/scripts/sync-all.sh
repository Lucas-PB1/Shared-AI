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
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
LINK_SCRIPT="$CURSOR_DIR/link-project.sh"
STATE_FILE="$CURSOR_DIR/hostdime-ia/sync-state.env"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/install/install-packages.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/install/hostdime-env.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/install/projects-registry.sh"

echo "HostDime IA — sync"
echo "Clone: $MONOREPO_ROOT"
echo ""

if [[ "$MIGRATE" -eq 1 ]]; then
  migrate_managed_real_files "$MONOREPO_ROOT"
fi

install_skills_package "$MONOREPO_ROOT"
install_code_review_package "$MONOREPO_ROOT"

if [[ "$PRUNE" -eq 1 ]]; then
  echo "→ prune symlinks órfãos"
  prune_user_symlinks_if_requested "$MONOREPO_ROOT"
fi

needs_npm=0
needs_composer=0
mkdir -p "$(dirname "$STATE_FILE")"

pkg_hash=""
composer_hash=""
if [[ -f "$MONOREPO_ROOT/package-lock.json" ]]; then
  pkg_hash="$(md5sum "$MONOREPO_ROOT/package-lock.json" | awk '{print $1}')"
fi
if [[ -f "$MONOREPO_ROOT/composer.lock" ]]; then
  composer_hash="$(md5sum "$MONOREPO_ROOT/composer.lock" | awk '{print $1}')"
fi

prev_pkg=""
prev_composer=""
if [[ -f "$STATE_FILE" ]]; then
  prev_pkg="$(grep '^PACKAGE_LOCK_HASH=' "$STATE_FILE" 2>/dev/null | cut -d= -f2- || true)"
  prev_composer="$(grep '^COMPOSER_LOCK_HASH=' "$STATE_FILE" 2>/dev/null | cut -d= -f2- || true)"
fi

if [[ -n "$pkg_hash" && "$pkg_hash" != "$prev_pkg" ]]; then
  needs_npm=1
  echo "package-lock.json alterado — npm install"
fi
if [[ -n "$composer_hash" && "$composer_hash" != "$prev_composer" ]]; then
  needs_composer=1
  echo "composer.lock alterado — composer install"
fi

if [[ "$needs_npm" -eq 1 ]]; then
  (cd "$MONOREPO_ROOT" && npm install)
fi
if [[ "$needs_composer" -eq 1 ]]; then
  (cd "$MONOREPO_ROOT" && composer install --quiet)
fi

{
  [[ -n "$pkg_hash" ]] && echo "PACKAGE_LOCK_HASH=$pkg_hash"
  [[ -n "$composer_hash" ]] && echo "COMPOSER_LOCK_HASH=$composer_hash"
} >"$STATE_FILE"

hostdime_update_sync_time

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
source "$SCRIPT_DIR/lib/install/boot-sync.sh"
boot_sync_prompt_if_needed
