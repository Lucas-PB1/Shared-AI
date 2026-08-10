#!/usr/bin/env bash
# Prepara pastas de review em .cursor/ do projeto.
# Rules do orquestrador e commands hostdime ficam só em ~/.cursor/ (não no projeto).
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

# Nunca tratar $HOME (nem o próprio ~/.cursor) como projeto — o cleanup
# de orquestrador/commands apagaria os artefatos globais do usuário.
TARGET_ABS="$(cd "$TARGET" 2>/dev/null && pwd -P)" || TARGET_ABS="$TARGET"
HOME_ABS="$(cd "$HOME" 2>/dev/null && pwd -P)" || HOME_ABS="$HOME"
CURSOR_ABS="$(cd "$CURSOR_DIR" 2>/dev/null && pwd -P)" || CURSOR_ABS="$CURSOR_DIR"
if [[ "$TARGET_ABS" == "$HOME_ABS" || "$TARGET_ABS" == "$CURSOR_ABS" ]]; then
  [[ "$QUIET" -eq 0 ]] && echo "Ignorado: $TARGET não pode ser bootstrap/sync (é o home ou ~/.cursor)" >&2
  exit 0
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

if [[ -z "${HOSTDIME_IA_ROOT:-}" || ! -d "$HOSTDIME_IA_ROOT" ]]; then
  [[ "$QUIET" -eq 0 ]] && echo "Erro: HOSTDIME_IA_ROOT não configurado" >&2
  echo "Execute: npm run setup:skills" >&2
  exit 1
fi

LIB="$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/sh/link-from-repo.sh"

# shellcheck disable=SC1091
source "$LIB"
# shellcheck disable=SC1091
source "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/sh/ensure-project-gitignore.sh"
export HOSTDIME_IA_ROOT
reset_link_counters

RULES_DIR="$TARGET/.cursor/rules"
COMMANDS_DIR="$TARGET/.cursor/commands"
REVIEW_DIR="$TARGET/.cursor/review"
mkdir -p "$REVIEW_DIR"/{inbox,reports,resultados}
# Não criar rules/commands vazios — só limpar se já existirem
[[ -d "$RULES_DIR" ]] || RULES_DIR=""
[[ -d "$COMMANDS_DIR" ]] || COMMANDS_DIR=""

touch "$REVIEW_DIR/inbox/.gitkeep" "$REVIEW_DIR/reports/.gitkeep" 2>/dev/null || true

MEMORIA_TS="$HOSTDIME_IA_ROOT/packages/code-review/bin/review-memoria.ts"
TSX_BIN="$HOSTDIME_IA_ROOT/node_modules/.bin/tsx"
if [[ -f "$MEMORIA_TS" && -x "$TSX_BIN" ]]; then
  "$TSX_BIN" "$MEMORIA_TS" migrar --write "$TARGET" >/dev/null || true
else
  # Fallback mínimo sem CLI
  echo "2" >"$REVIEW_DIR/.memoria-version"
  [[ -f "$REVIEW_DIR/decisions.jsonl" ]] || : >"$REVIEW_DIR/decisions.jsonl"
  CONV_TEMPLATE="$HOSTDIME_IA_ROOT/packages/code-review/templates/convencoes.md"
  if [[ ! -f "$REVIEW_DIR/convencoes.md" && -f "$CONV_TEMPLATE" ]]; then
    cp "$CONV_TEMPLATE" "$REVIEW_DIR/convencoes.md"
  fi
fi
# Nunca deixar artefatos inválidos de memória no projeto
rm -f "$REVIEW_DIR/memoria.md" "$REVIEW_DIR/context.json"

# Garantir ausência de espelhos: orquestrador + commands só em ~/.cursor/
[[ -n "$RULES_DIR" ]] && remove_project_orchestrator_rule_symlinks "$RULES_DIR"
[[ -n "$COMMANDS_DIR" ]] && remove_project_managed_command_symlinks "$COMMANDS_DIR"

# Pastas vazias após limpeza
if [[ -n "$RULES_DIR" && -d "$RULES_DIR" ]] && [[ -z "$(find "$RULES_DIR" -mindepth 1 -maxdepth 1 2>/dev/null | head -1)" ]]; then
  rmdir "$RULES_DIR" 2>/dev/null || true
fi
if [[ -n "$COMMANDS_DIR" && -d "$COMMANDS_DIR" ]] && [[ -z "$(find "$COMMANDS_DIR" -mindepth 1 -maxdepth 1 2>/dev/null | head -1)" ]]; then
  rmdir "$COMMANDS_DIR" 2>/dev/null || true
fi

ensure_project_gitignore "$TARGET"
if [[ "$QUIET" -eq 0 ]]; then
  echo ""
  echo "Concluído em $TARGET/.cursor/"
  echo "  review/ → reports/, resultados/, memória v2 (context/decisions)"
  echo "  orquestrador → ~/.cursor/rules/ (global)"
  echo "  commands → ~/.cursor/commands/ (global)"
  [[ "$LINK_ORCHESTRATOR_REMOVED" -gt 0 ]] && echo "  removidos do projeto: $LINK_ORCHESTRATOR_REMOVED skills-orchestrator-*.mdc"
  [[ "$LINK_COMMANDS_REMOVED" -gt 0 ]] && echo "  removidos do projeto: $LINK_COMMANDS_REMOVED command(s)"
  [[ "$LINK_SKIPPED" -gt 0 ]] && echo "Ignorados (arquivo real do projeto): $LINK_SKIPPED"
fi

exit 0
