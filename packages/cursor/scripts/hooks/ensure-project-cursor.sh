#!/usr/bin/env bash
# Garante symlinks e registra projeto no sessionStart.
set -euo pipefail

INPUT="$(cat)"
LINK_SCRIPT="${CURSOR_LINK_PROJECT_SCRIPT:-${CURSOR_LINK_RULES_SCRIPT:-$HOME/.cursor/link-project.sh}}"
REGISTRY_SCRIPT="${HOME}/.cursor/hostdime-projects-registry.sh"
ENV_SCRIPT="${HOME}/.cursor/hostdime-env.sh"

read_json_field() {
  local field="$1"
  python3 -c "
import json, sys
data = json.load(sys.stdin)
value = data
for part in '''${field}'''.split('.'):
    if not part:
        continue
    if isinstance(value, list) and part.isdigit():
        index = int(part)
        value = value[index] if 0 <= index < len(value) else None
    elif isinstance(value, dict):
        value = value.get(part)
    else:
        value = None
        break
if value is None:
    sys.exit(1)
print(value)
" <<<"$INPUT" 2>/dev/null
}

ROOT="${CURSOR_PROJECT_DIR:-}"
if [[ -z "$ROOT" ]]; then
  ROOT="$(read_json_field "workspace_roots.0" 2>/dev/null || true)"
fi

if [[ -z "$ROOT" || ! -d "$ROOT" ]]; then
  exit 0
fi

if [[ -x "$LINK_SCRIPT" ]]; then
  "$LINK_SCRIPT" --quiet "$ROOT" 2>/dev/null || true
fi

if [[ -x "$REGISTRY_SCRIPT" ]]; then
  # shellcheck disable=SC1091
  source "$REGISTRY_SCRIPT"
  register_project "$ROOT" 2>/dev/null || true
fi

if [[ -f "${HOME}/.cursor/hostdime-ia.env" && -x "$ENV_SCRIPT" ]]; then
  # shellcheck disable=SC1091
  source "$ENV_SCRIPT"
  # shellcheck disable=SC1090
  source "${HOME}/.cursor/hostdime-ia.env"
  if [[ -n "${HOSTDIME_IA_ROOT:-}" && -d "$HOSTDIME_IA_ROOT" ]]; then
    current="$(hostdime_read_version "$HOSTDIME_IA_ROOT")"
    installed="${HOSTDIME_IA_VERSION:-?}"
    if [[ "$current" != "$installed" && "$current" != "?" ]]; then
      echo "HostDime IA: versão do clone ($current) difere da instalada ($installed). Rode: npm run sync" >&2
    fi
  fi
fi

exit 0
