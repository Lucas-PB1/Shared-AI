#!/usr/bin/env bash
# Saúde multi-projeto: repos registrados, symlinks, git, review inbox.
# Uso: npm run health [-- --json]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
ENV_FILE="$CURSOR_DIR/hostdime-ia.env"
JSON=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) JSON=1; shift ;;
    -h | --help)
      echo "Uso: npm run health [-- --json]"
      exit 0
      ;;
    *) echo "Argumento desconhecido: $1" >&2; exit 1 ;;
  esac
done

# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/hostdime-env.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/projects-registry.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/health-check.sh"

total_issues=0
project_count=0
machine_issues=0
root=""
current=""
installed=""

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  root="${HOSTDIME_IA_ROOT:-}"
  if [[ -d "$root" ]]; then
    current="$(hostdime_read_version "$root")"
    installed="${HOSTDIME_IA_VERSION:-?}"
    if [[ "$current" != "$installed" ]]; then
      machine_issues=$((machine_issues + 1))
    fi
  else
    machine_issues=$((machine_issues + 1))
  fi
else
  machine_issues=$((machine_issues + 1))
fi

if [[ "$JSON" -eq 1 ]]; then
  _registry_ensure
  hostdime_tsx "$SCRIPT_DIR/../lib/install/ts/health-json.ts" "$ENV_FILE" "$REGISTRY_FILE"
  exit 0
fi

echo "HostDime IA — health (projetos registrados)"
echo ""

section() { echo "=== $1 ==="; }

section "Máquina"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "  ✗ hostdime-ia não instalado — npm run setup:skills"
  machine_issues=$((machine_issues + 1))
elif [[ ! -d "$root" ]]; then
  echo "  ✗ clone não encontrado: $root"
  machine_issues=$((machine_issues + 1))
else
  if [[ "$current" != "$installed" ]]; then
    echo "  ⚠ versão desatualizada (clone=$current, instalada=$installed) — git pull && npm run sync"
    machine_issues=$((machine_issues + 1))
  else
    echo "  ✓ versão em dia ($current)"
  fi
fi

section "Projetos"
_registry_ensure
prune_missing_projects

while IFS= read -r project; do
  [[ -n "$project" ]] || continue
  project_count=$((project_count + 1))
  issues=0
  health_check_project "$project" || issues=$?
  total_issues=$((total_issues + issues))
  echo ""
done < <(list_projects)

if [[ "$project_count" -eq 0 ]]; then
  echo "  (nenhum — npm run bootstrap -- <repo> ou /onboard)"
fi

echo ""
echo "=== Resumo ==="
grand_total=$((total_issues + machine_issues))
echo "  Projetos: $project_count"
echo "  Pendências: $grand_total"

if [[ "$grand_total" -eq 0 ]]; then
  echo "  Status: OK"
  exit 0
fi

echo "  Status: atenção — detalhes acima; npm run doctor para diagnóstico da máquina"
exit 1
