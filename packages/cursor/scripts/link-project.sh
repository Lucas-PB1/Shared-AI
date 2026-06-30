#!/usr/bin/env bash
# Liga rules, commands e pastas de review em .cursor/ do projeto (symlinks).
# Uso: link-project.sh [--quiet] /caminho/do/repo
set -euo pipefail

QUIET=0
if [[ "${1:-}" == "--quiet" ]]; then
  QUIET=1
  shift
fi

RULE_SRC="${CURSOR_RULES_DIR:-$HOME/.cursor/rules}"
COMMAND_SRC="${CURSOR_COMMANDS_DIR:-$HOME/.cursor/commands}"
TARGET="${1:?Informe o diretório raiz do projeto}"

if [ ! -d "$RULE_SRC" ]; then
  [[ "$QUIET" -eq 0 ]] && echo "Erro: pasta de rules não encontrada: $RULE_SRC" >&2
  echo "Execute primeiro: npm run setup:skills" >&2
  exit 1
fi

RULES_DIR="$TARGET/.cursor/rules"
COMMANDS_DIR="$TARGET/.cursor/commands"
REVIEW_DIR="$TARGET/.cursor/review"
mkdir -p "$RULES_DIR" "$COMMANDS_DIR" "$REVIEW_DIR"/{inbox,reports,resultados}

touch "$REVIEW_DIR/inbox/.gitkeep" "$REVIEW_DIR/reports/.gitkeep" 2>/dev/null || true

link_file() {
  local src="$1"
  local dest_dir="$2"
  local name
  name=$(basename "$src")
  local dest="$dest_dir/$name"

  [ -f "$src" ] || return 0

  if [ -e "$dest" ] && [ ! -L "$dest" ]; then
    SKIPPED=$((SKIPPED + 1))
    [[ "$QUIET" -eq 0 ]] && echo "Pulando $name — arquivo real no projeto."
    return 0
  fi

  local current target_path
  current="$(readlink -f "$dest" 2>/dev/null || true)"
  target_path="$(readlink -f "$src" 2>/dev/null || echo "$src")"
  if [[ "$current" == "$target_path" ]]; then
    return 0
  fi

  ln -sf "$src" "$dest"
  LINKED=$((LINKED + 1))
  [[ "$QUIET" -eq 0 ]] && echo "Link: $dest -> $src"
}

LINKED=0
SKIPPED=0

for src in "$RULE_SRC"/skills-orchestrator-*.mdc; do
  link_file "$src" "$RULES_DIR"
done

if [ -d "$COMMAND_SRC" ]; then
  for name in avaliar.md finalizar.md; do
    link_file "$COMMAND_SRC/$name" "$COMMANDS_DIR"
  done
fi

if [[ "$QUIET" -eq 0 ]]; then
  echo ""
  echo "Concluído: $LINKED symlink(s) em $TARGET/.cursor/"
  echo "  review/ → inbox/, reports/, resultados/"
  [[ "$SKIPPED" -gt 0 ]] && echo "Ignorados (arquivo real do projeto): $SKIPPED"
fi

exit 0
