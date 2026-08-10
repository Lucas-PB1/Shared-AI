#!/usr/bin/env bash
# Garante symlinks e registra projeto no sessionStart.
set -euo pipefail

INPUT="$(cat)"
LINK_SCRIPT="${CURSOR_LINK_PROJECT_SCRIPT:-${CURSOR_LINK_RULES_SCRIPT:-$HOME/.cursor/link-project.sh}}"
REGISTRY_SCRIPT="${HOME}/.cursor/hostdime-projects-registry.sh"
ENV_SCRIPT="${HOME}/.cursor/hostdime-env.sh"

read_json_field() {
  local field="$1"
  node --input-type=module -e '
import { readFileSync } from "node:fs";
const field = process.argv[1];
const data = JSON.parse(readFileSync(0, "utf-8"));
let value = data;
for (const part of field.split(".")) {
  if (!part) continue;
  if (Array.isArray(value) && /^\d+$/.test(part)) {
    const i = Number(part);
    value = i >= 0 && i < value.length ? value[i] : null;
  } else if (value && typeof value === "object") {
    value = value[part];
  } else {
    value = null;
    break;
  }
}
if (value == null) process.exit(1);
process.stdout.write(String(value));
' "$field" <<<"$INPUT" 2>/dev/null
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
