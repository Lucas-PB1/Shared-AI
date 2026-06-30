#!/usr/bin/env bash
# Liga rules orquestradoras em .cursor/rules/ do projeto (symlinks).
# Uso: link-project-rules.sh [--quiet] /caminho/do/repo
set -euo pipefail

QUIET=0
if [[ "${1:-}" == "--quiet" ]]; then
  QUIET=1
  shift
fi

RULE_SRC="${CURSOR_RULES_DIR:-$HOME/.cursor/rules}"
TARGET="${1:?Informe o diretório raiz do projeto}"

if [ ! -d "$RULE_SRC" ]; then
  [[ "$QUIET" -eq 0 ]] && echo "Erro: pasta de rules não encontrada: $RULE_SRC" >&2
  echo "Execute primeiro: npm run setup" >&2
  exit 1
fi

RULES_DIR="$TARGET/.cursor/rules"
mkdir -p "$RULES_DIR"

linked=0
skipped=0
for src in "$RULE_SRC"/skills-orchestrator-*.mdc; do
  [ -f "$src" ] || continue
  name=$(basename "$src")
  dest="$RULES_DIR/$name"

  if [ -e "$dest" ] && [ ! -L "$dest" ]; then
    skipped=$((skipped + 1))
    [[ "$QUIET" -eq 0 ]] && echo "Pulando $name — arquivo real no projeto (rule específica)."
    continue
  fi

  current="$(readlink -f "$dest" 2>/dev/null || true)"
  target="$(readlink -f "$src" 2>/dev/null || echo "$src")"
  if [[ "$current" == "$target" ]]; then
    continue
  fi

  ln -sf "$src" "$dest"
  linked=$((linked + 1))
  [[ "$QUIET" -eq 0 ]] && echo "Link: $dest -> $src"
done

if [[ "$QUIET" -eq 0 ]]; then
  echo ""
  echo "Concluído: $linked symlink(s) em $RULES_DIR"
  [[ "$skipped" -gt 0 ]] && echo "Ignorados (rule real do projeto): $skipped"
fi

exit 0
