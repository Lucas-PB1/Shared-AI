#!/usr/bin/env bash
# Doctor unificado: instalação, ferramentas, hooks e symlinks.
# Uso: npm run doctor
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
ENV_FILE="$CURSOR_DIR/hostdime-ia.env"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/hostdime-env.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/projects-registry.sh"

issues=0

ok() {
  echo "  ✓ $1"
}

fail() {
  echo "  ✗ $1"
  issues=$((issues + 1))
}

warn() {
  echo "  ⚠ $1"
  issues=$((issues + 1))
}

section() {
  echo ""
  echo "=== $1 ==="
}

check_cmd() {
  local label="$1"
  local bin="$2"
  if command -v "$bin" >/dev/null 2>&1; then
    ok "$label"
  else
    fail "$label — comando \`$bin\` não encontrado"
  fi
}

check_node_major() {
  local major
  major="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
  if [[ "$major" -ge 20 ]]; then
    ok "Node.js $(node -v 2>/dev/null || echo '?') (≥20)"
  else
    fail "Node.js 20+ necessário (atual: $(node -v 2>/dev/null || echo '?'))"
  fi
}

hooks_has_session_start() {
  local hooks_file="$1"
  python3 - "$hooks_file" <<'PY'
import json
import sys

path = sys.argv[1]
try:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
except (OSError, json.JSONDecodeError):
    sys.exit(1)

hooks = data.get("hooks") or {}
session = hooks.get("sessionStart") or []
for entry in session:
    if not isinstance(entry, dict):
        continue
    cmd = entry.get("command", "")
    if "ensure-project-cursor" in cmd or "ensure-project-rules" in cmd:
        sys.exit(0)
sys.exit(2)
PY
}

count_user_symlink_issues() {
  local root="$1"
  local broken=0 missing=0 skipped=0
  local f skill dest

  for f in "$root/packages/cursor/rules"/skills-orchestrator-*.mdc; do
    [[ -f "$f" ]] || continue
    dest="$CURSOR_DIR/rules/$(basename "$f")"
    if [[ -e "$dest" && ! -L "$dest" ]]; then
      skipped=$((skipped + 1))
    elif [[ -L "$dest" && ! -e "$dest" ]]; then
      broken=$((broken + 1))
    elif [[ ! -e "$dest" ]]; then
      missing=$((missing + 1))
    fi
  done

  for skill in "$root/packages/cursor/skills"/*/ "$root/packages/code-review/skills"/*/; do
    [[ -d "$skill" ]] || continue
    dest="$CURSOR_DIR/skills/$(basename "$skill")"
    if [[ -e "$dest" && ! -L "$dest" ]]; then
      skipped=$((skipped + 1))
    elif [[ -L "$dest" && ! -e "$dest" ]]; then
      broken=$((broken + 1))
    elif [[ ! -e "$dest" ]]; then
      missing=$((missing + 1))
    fi
  done

  for cmd in avaliar.md finalizar.md avaliar-diff.md skills-why.md hubspot-mcp.md cursor-cli.md historico.md sync-inbox.md onboard.md; do
    dest="$CURSOR_DIR/commands/$cmd"
    if [[ -e "$dest" && ! -L "$dest" ]]; then
      skipped=$((skipped + 1))
    elif [[ -L "$dest" && ! -e "$dest" ]]; then
      broken=$((broken + 1))
    elif [[ ! -e "$dest" ]]; then
      missing=$((missing + 1))
    fi
  done

  echo "$broken $missing $skipped"
}

echo "HostDime IA — doctor"

section "Instalação"
root=""
if [[ ! -f "$ENV_FILE" ]]; then
  fail "hostdime-ia.env — rode: npm run setup:skills"
else
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  root="${HOSTDIME_IA_ROOT:-}"
  ok "hostdime-ia.env"
  if [[ -d "$root" ]]; then
    ok "clone em $root"
    current="$(hostdime_read_version "$root")"
    installed="${HOSTDIME_IA_VERSION:-?}"
    if [[ "$current" != "$installed" ]]; then
      warn "versão desatualizada (clone=$current, instalada=$installed) — git pull && npm run sync"
    else
      ok "versão em dia ($current)"
    fi
  else
    fail "clone não encontrado: $root"
  fi
fi

section "Ferramentas"
if command -v node >/dev/null 2>&1; then
  check_node_major
else
  fail "Node.js — comando \`node\` não encontrado"
fi
check_cmd "npm" npm
check_cmd "PHP" php
check_cmd "Composer" composer
check_cmd "Semgrep" semgrep
check_cmd "Python 3 (hooks JSON)" python3

section "Dependências do clone"
if [[ -n "$root" && -d "$root" ]]; then
  if [[ -d "$root/node_modules" ]]; then
    ok "node_modules"
  else
    fail "node_modules — rode: npm run setup:code-review"
  fi
  if [[ -x "$root/vendor/bin/phpstan" ]]; then
    ok "PHPStan"
  else
    fail "PHPStan — rode: npm run setup:code-review"
  fi
fi

section "~/.cursor (artefatos)"
for script in link-project.sh review-check.sh review-finalizar.sh review-diff.sh review-ci.sh; do
  if [[ -x "$CURSOR_DIR/$script" ]]; then
    ok "$script"
  else
    fail "$script — rode: npm run setup:skills && npm run setup:code-review"
  fi
done

for cmd in avaliar.md finalizar.md avaliar-diff.md skills-why.md hubspot-mcp.md cursor-cli.md historico.md sync-inbox.md onboard.md; do
  if [[ -L "$CURSOR_DIR/commands/$cmd" && -e "$CURSOR_DIR/commands/$cmd" ]]; then
    ok "command /${cmd%.md}"
  elif [[ -f "$CURSOR_DIR/commands/$cmd" ]]; then
    warn "command /${cmd%.md} — arquivo real (não symlink); rode npm run sync -- --migrate"
  else
    fail "command /${cmd%.md} — rode: npm run setup:code-review"
  fi
done

if [[ -L "$CURSOR_DIR/SKILLS-ROUTING.md" && -e "$CURSOR_DIR/SKILLS-ROUTING.md" ]]; then
  ok "SKILLS-ROUTING.md"
elif [[ -f "$CURSOR_DIR/SKILLS-ROUTING.md" ]]; then
  warn "SKILLS-ROUTING.md — cópia local; prefira symlink (npm run sync -- --migrate)"
else
  fail "SKILLS-ROUTING.md — rode: npm run setup:skills"
fi

if [[ -x "$CURSOR_DIR/install-hubspot-mcp.sh" ]]; then
  ok "install-hubspot-mcp.sh"
else
  warn "install-hubspot-mcp.sh — rode: npm run setup:skills"
fi

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/hubspot-mcp.sh"
if hubspot_mcp_installed; then
  ok "MCP HubSpotDev em mcp.json"
elif [[ "$(hubspot_mcp_read_status)" == "declined" ]]; then
  ok "MCP HubSpot — usuário optou por não instalar (/hubspot-mcp disponível)"
else
  warn "MCP HubSpotDev ausente — use /hubspot-mcp ou aguarde sugestão na primeira tarefa HubSpot"
fi

section "Hooks"
hooks_file="$CURSOR_DIR/hooks.json"
hook_script="$CURSOR_DIR/hooks/ensure-project-cursor.sh"

if [[ -x "$hook_script" ]]; then
  ok "ensure-project-cursor.sh"
else
  fail "ensure-project-cursor.sh — rode: npm run setup:skills"
fi

if [[ ! -f "$hooks_file" ]]; then
  fail "hooks.json ausente — rode: npm run setup:skills ou npm run sync"
elif hooks_has_session_start "$hooks_file"; then
  ok "hooks.json com sessionStart → ensure-project-cursor"
else
  rc=$?
  if [[ "$rc" -eq 2 ]]; then
    warn "hooks.json sem sessionStart do hostdime-ia — adicione ensure-project-cursor.sh"
  else
    fail "hooks.json inválido ou ilegível"
  fi
fi

section "Symlinks (~/.cursor)"
if [[ -n "$root" && -d "$root" ]]; then
  read -r broken missing skipped < <(count_user_symlink_issues "$root")
  if [[ "$broken" -eq 0 && "$missing" -eq 0 && "$skipped" -eq 0 ]]; then
    ok "rules, skills e commands linkados"
  else
    [[ "$broken" -gt 0 ]] && warn "$broken symlink(s) quebrado(s) — npm run sync"
    [[ "$missing" -gt 0 ]] && warn "$missing symlink(s) ausente(s) — npm run sync"
    [[ "$skipped" -gt 0 ]] && warn "$skipped artefato(s) real(is) no caminho do pacote — veja npm run status"
  fi
else
  warn "symlinks não verificados (clone ausente)"
fi

section "Projetos registrados"
_registry_ensure
prune_missing_projects
project_count=0
project_issues=0
while IFS= read -r project; do
  [[ -n "$project" ]] || continue
  project_count=$((project_count + 1))
  if [[ ! -d "$project" ]]; then
    warn "projeto inexistente: $project"
    project_issues=$((project_issues + 1))
    continue
  fi
  broken=0
  for f in "$project/.cursor/rules"/*; do
    [[ -L "$f" && ! -e "$f" ]] && broken=$((broken + 1))
  done
  if [[ "$broken" -gt 0 ]]; then
    warn "$project — $broken symlink(s) quebrado(s) em .cursor/rules/"
    project_issues=$((project_issues + 1))
  fi
done < <(list_projects)

if [[ "$project_count" -eq 0 ]]; then
  ok "nenhum registrado (opcional — npm run bootstrap -- <repo>)"
elif [[ "$project_issues" -eq 0 ]]; then
  ok "$project_count projeto(s) registrado(s)"
fi

echo ""
if [[ "$issues" -eq 0 ]]; then
  echo "Resumo: OK"
  exit 0
fi

echo "Resumo: $issues pendência(s) — detalhes em npm run status"
exit 1
