#!/usr/bin/env bash
# Doctor unificado: instalação, ferramentas, hooks e symlinks.
# Uso: npm run doctor
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
ENV_FILE="$CURSOR_DIR/shared-ai.env"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/shared-ai-env.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../lib/install/sh/projects-registry.sh"

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
  node --input-type=module -e '
import { readFileSync } from "node:fs";
const path = process.argv[1];
let data;
try {
  data = JSON.parse(readFileSync(path, "utf-8"));
} catch {
  process.exit(1);
}
const session = data?.hooks?.sessionStart ?? [];
for (const entry of session) {
  if (!entry || typeof entry !== "object") continue;
  const cmd = entry.command ?? "";
  if (typeof cmd === "string" && (cmd.includes("ensure-project-cursor") || cmd.includes("ensure-project-rules"))) {
    process.exit(0);
  }
}
process.exit(2);
' "$hooks_file"
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

  for skill in "$root/packages/cursor/skills"/*/; do
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

  for cmd in skills-why.md cursor-cli.md historico.md sync-inbox.md onboard.md; do
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

echo "Shared AI — doctor"

section "Instalação"
root=""
if [[ ! -f "$ENV_FILE" ]]; then
  fail "shared-ai.env — rode: npm run setup:skills"
else
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  root="${SHARED_AI_ROOT:-}"
  ok "shared-ai.env"
  if [[ -d "$root" ]]; then
    ok "clone em $root"
    current="$(shared_ai_read_version "$root")"
    installed="${SHARED_AI_VERSION:-?}"
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
if shared_ai_tsx_bin >/dev/null 2>&1; then
  ok "tsx/Node (hooks JSON)"
else
  fail "tsx/Node — rode: npm install (tsx para scripts/hooks JSON)"
fi

section "Dependências do clone"
if [[ -n "$root" && -d "$root" ]]; then
  if [[ -d "$root/node_modules" ]]; then
    ok "node_modules"
  else
    fail "node_modules — rode: npm install"
  fi
fi

section "~/.cursor (artefatos)"
for script in link-project.sh; do
  if [[ -x "$CURSOR_DIR/$script" ]]; then
    ok "$script"
  else
    fail "$script — rode: npm run setup:skills"
  fi
done

for cmd in skills-why.md cursor-cli.md historico.md sync-inbox.md onboard.md; do
  if [[ -L "$CURSOR_DIR/commands/$cmd" && -e "$CURSOR_DIR/commands/$cmd" ]]; then
    ok "command /${cmd%.md}"
  elif [[ -f "$CURSOR_DIR/commands/$cmd" ]]; then
    warn "command /${cmd%.md} — arquivo real (não symlink); rode npm run sync -- --migrate"
  else
    fail "command /${cmd%.md} — rode: npm run setup:skills"
  fi
done

if [[ -L "$CURSOR_DIR/SKILLS-ROUTING.md" && -e "$CURSOR_DIR/SKILLS-ROUTING.md" ]]; then
  ok "SKILLS-ROUTING.md"
elif [[ -f "$CURSOR_DIR/SKILLS-ROUTING.md" ]]; then
  warn "SKILLS-ROUTING.md — cópia local; prefira symlink (npm run sync -- --migrate)"
else
  fail "SKILLS-ROUTING.md — rode: npm run setup:skills"
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
    warn "hooks.json sem sessionStart do shared-ai — adicione ensure-project-cursor.sh"
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
