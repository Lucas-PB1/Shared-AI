#!/usr/bin/env bash
# Saúde multi-projeto: repos registrados, symlinks, git, review inbox.
# Uso: npm run health [-- --json]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
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
source "$SCRIPT_DIR/lib/hostdime-env.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/projects-registry.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/health-check.sh"

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
  python3 - "$ENV_FILE" "$REGISTRY_FILE" "$MONOREPO_ROOT" <<'PY'
import json
import os
import subprocess
import sys
from pathlib import Path

env_file, registry_file, monorepo = sys.argv[1:4]
result = {
    "machine": {"ok": True, "version_clone": None, "version_installed": None, "issues": []},
    "projects": [],
    "summary": {"project_count": 0, "issues": 0},
}

if os.path.isfile(env_file):
    env = {}
    for line in Path(env_file).read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"')
    root = env.get("HOSTDIME_IA_ROOT", "")
    ver_file = Path(root) / "VERSION" if root else None
    if ver_file and ver_file.is_file():
        result["machine"]["version_clone"] = ver_file.read_text(encoding="utf-8").strip()
    result["machine"]["version_installed"] = env.get("HOSTDIME_IA_VERSION")
    if result["machine"]["version_clone"] != result["machine"]["version_installed"]:
        result["machine"]["issues"].append("version_mismatch")
        result["machine"]["ok"] = False
else:
    result["machine"]["issues"].append("not_installed")
    result["machine"]["ok"] = False

detect = Path(monorepo) / "packages/cursor/scripts/lib/detect-stack.py"

def run_health_script(project: str) -> dict:
    item = {"path": project, "ok": True, "issues": [], "profile": "—", "git_dirty": 0, "inbox": 0}
    if not os.path.isdir(project):
        item["ok"] = False
        item["issues"].append("missing")
        return item

    rules = Path(project) / ".cursor/rules"
    if rules.is_dir():
        broken = sum(1 for f in rules.iterdir() if f.is_symlink() and not f.exists())
        if broken:
            item["issues"].append(f"broken_symlinks:{broken}")
            item["ok"] = False

    profile_found = False
    if rules.is_dir():
        for f in rules.glob("*-project.mdc"):
            item["profile"] = f.stem.replace("-project", "")
            profile_found = True
            break
    if not profile_found and (Path(project) / ".cursor/SKILLS-ROUTING.md").is_file():
        item["profile"] = "custom"

    inbox = Path(project) / ".cursor/review/inbox"
    if inbox.is_dir():
        item["inbox"] = sum(
            1 for f in inbox.iterdir()
            if f.name != ".gitkeep" and f.is_file()
        )
        if item["inbox"]:
            item["issues"].append(f"review_inbox:{item['inbox']}")

    try:
        subprocess.run(["git", "-C", project, "rev-parse", "--is-inside-work-tree"],
                       check=True, capture_output=True)
        dirty = subprocess.run(
            ["git", "-C", project, "status", "--porcelain"],
            check=True, capture_output=True, text=True,
        ).stdout.strip().splitlines()
        item["git_dirty"] = len([l for l in dirty if l])
        if item["git_dirty"]:
            item["issues"].append(f"git_dirty:{item['git_dirty']}")
    except subprocess.CalledProcessError:
        item["issues"].append("no_git")

    if detect.is_file() and item["profile"] == "—":
        try:
            proc = subprocess.run(
                ["python3", str(detect), project],
                check=True, capture_output=True, text=True,
            )
            suggested = proc.stdout.strip()
            if suggested:
                item["suggested_profile"] = suggested
                item["issues"].append("missing_profile")
        except subprocess.CalledProcessError:
            pass

    if item["issues"]:
        item["ok"] = False
    return item

if os.path.isfile(registry_file):
    data = json.loads(Path(registry_file).read_text(encoding="utf-8"))
    for entry in data.get("projects", []):
        path = entry.get("path", "")
        if path and os.path.isdir(path):
            result["projects"].append(run_health_script(path))

result["summary"]["project_count"] = len(result["projects"])
result["summary"]["issues"] = sum(len(p["issues"]) for p in result["projects"])
if not result["machine"]["ok"]:
    result["summary"]["issues"] += len(result["machine"]["issues"])
print(json.dumps(result, indent=2))
PY
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
