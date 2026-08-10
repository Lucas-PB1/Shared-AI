#!/usr/bin/env bash
# Compat — delega para link-project.sh
exec "$(cd "$(dirname "$0")" && pwd)/link-project.sh" "$@"
