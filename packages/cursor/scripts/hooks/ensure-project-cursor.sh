#!/usr/bin/env bash
# Garante symlinks do orquestrador, commands e review dirs no workspace.
# Chamado pelo hook sessionStart (~/.cursor/hooks.json).
set -euo pipefail

INPUT="$(cat)"
LINK_SCRIPT="${CURSOR_LINK_PROJECT_SCRIPT:-${CURSOR_LINK_RULES_SCRIPT:-$HOME/.cursor/link-project.sh}}"

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

if [[ ! -x "$LINK_SCRIPT" ]]; then
  exit 0
fi

"$LINK_SCRIPT" --quiet "$ROOT" 2>/dev/null || true
exit 0
