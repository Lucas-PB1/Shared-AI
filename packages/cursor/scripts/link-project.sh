#!/usr/bin/env bash
# Liga rules, commands e pastas de review em .cursor/ do projeto (symlinks ao clone).
# Uso: link-project.sh [--quiet] /caminho/do/repo
set -euo pipefail

QUIET=0
if [[ "${1:-}" == "--quiet" ]]; then
  QUIET=1
  shift
fi

TARGET="${1:?Informe o diretório raiz do projeto}"
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
ENV_FILE="$CURSOR_DIR/hostdime-ia.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

if [[ -z "${HOSTDIME_IA_ROOT:-}" || ! -d "$HOSTDIME_IA_ROOT" ]]; then
  [[ "$QUIET" -eq 0 ]] && echo "Erro: HOSTDIME_IA_ROOT não configurado" >&2
  echo "Execute: npm run setup:skills" >&2
  exit 1
fi

RULE_SRC="$HOSTDIME_IA_ROOT/packages/cursor/rules"
COMMAND_SRC="$HOSTDIME_IA_ROOT/packages/code-review/commands"
COMMAND_CURSOR_SRC="$HOSTDIME_IA_ROOT/packages/cursor/commands"
LIB="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/link-from-repo.sh"

# shellcheck disable=SC1091
source "$LIB"
# shellcheck disable=SC1091
source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/ensure-project-gitignore.sh"
export HOSTDIME_IA_ROOT
reset_link_counters

RULES_DIR="$TARGET/.cursor/rules"
COMMANDS_DIR="$TARGET/.cursor/commands"
REVIEW_DIR="$TARGET/.cursor/review"
mkdir -p "$RULES_DIR" "$COMMANDS_DIR" "$REVIEW_DIR"/{inbox,reports,resultados}

touch "$REVIEW_DIR/inbox/.gitkeep" "$REVIEW_DIR/reports/.gitkeep" 2>/dev/null || true

MEMORIA_TEMPLATE="$HOSTDIME_IA_ROOT/packages/code-review/templates/memoria.md"
if [[ ! -f "$REVIEW_DIR/memoria.md" && -f "$MEMORIA_TEMPLATE" ]]; then
  cp "$MEMORIA_TEMPLATE" "$REVIEW_DIR/memoria.md"
fi

link_glob "$RULE_SRC/skills-orchestrator-*.mdc" "$RULES_DIR"
link_file "$COMMAND_SRC/avaliar.md" "$COMMANDS_DIR"
link_file "$COMMAND_SRC/finalizar.md" "$COMMANDS_DIR"
link_file "$COMMAND_SRC/avaliar-diff.md" "$COMMANDS_DIR"
link_glob "$COMMAND_CURSOR_SRC/*.md" "$COMMANDS_DIR"

ensure_project_gitignore "$TARGET"
if [[ "$QUIET" -eq 0 ]]; then
  echo ""
  echo "Concluído: $LINK_LINKED symlink(s) em $TARGET/.cursor/"
  echo "  review/ → reports/, resultados/, memoria.md"
  [[ "$LINK_SKIPPED" -gt 0 ]] && echo "Ignorados (arquivo real do projeto): $LINK_SKIPPED"
fi

exit 0
