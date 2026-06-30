#!/usr/bin/env bash
# Delega ao doctor unificado (cursor + code-review + hooks).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$SCRIPT_DIR/../../cursor/scripts/doctor.sh" "$@"
