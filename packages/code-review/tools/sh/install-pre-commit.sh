#!/usr/bin/env bash
# Instala git hook pre-commit apontando para review-pre-commit.sh.
#
# Uso:
#   HOSTDIME_IA_ROOT=/path/hostdime-ia bash install-pre-commit.sh [projeto]
#   npm run hooks:pre-commit -- /caminho/do/projeto
#   npm run hooks:pre-commit -- .   # no clone hostdime-ia
#
# Remove / desliga: HOSTDIME_SKIP_PRE_COMMIT=1  ou apague .git/hooks/pre-commit
# Se já existia hook sem marcador hostdime, preserva como pre-commit.local e encadeia.
set -euo pipefail

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOSTDIME_IA_ROOT="${HOSTDIME_IA_ROOT:-}"

if [[ -z "$HOSTDIME_IA_ROOT" || ! -d "$HOSTDIME_IA_ROOT" ]]; then
  if [[ -f "$TOOLS_DIR/../../../../package.json" ]] && grep -q '"name": "hostdime-ia"' "$TOOLS_DIR/../../../../package.json" 2>/dev/null; then
    HOSTDIME_IA_ROOT="$(cd "$TOOLS_DIR/../../../.." && pwd)"
  fi
fi

if [[ -z "$HOSTDIME_IA_ROOT" || ! -d "$HOSTDIME_IA_ROOT" ]]; then
  echo "Erro: HOSTDIME_IA_ROOT não definido." >&2
  exit 1
fi

PROJECT="${1:-.}"
PROJECT="$(cd "$PROJECT" && pwd)"

if [[ ! -d "$PROJECT/.git" ]]; then
  # worktree ou bare
  if ! git -C "$PROJECT" rev-parse --git-dir >/dev/null 2>&1; then
    echo "Erro: $PROJECT não é um repositório git." >&2
    exit 1
  fi
fi

GIT_DIR="$(git -C "$PROJECT" rev-parse --git-dir)"
# absolute
if [[ "$GIT_DIR" != /* ]]; then
  GIT_DIR="$PROJECT/$GIT_DIR"
fi
HOOKS_DIR="$GIT_DIR/hooks"
HOOK="$HOOKS_DIR/pre-commit"
MARKER="# hostdime-ia pre-commit"
PRE_COMMIT_SRC="$HOSTDIME_IA_ROOT/packages/code-review/tools/sh/review-pre-commit.sh"

if [[ ! -x "$PRE_COMMIT_SRC" ]]; then
  chmod +x "$PRE_COMMIT_SRC" 2>/dev/null || true
fi
if [[ ! -f "$PRE_COMMIT_SRC" ]]; then
  echo "Erro: não encontrado $PRE_COMMIT_SRC" >&2
  exit 1
fi

mkdir -p "$HOOKS_DIR"

if [[ -f "$HOOK" ]] && ! grep -qF "$MARKER" "$HOOK" 2>/dev/null; then
  if [[ ! -f "$HOOKS_DIR/pre-commit.local" ]]; then
    cp "$HOOK" "$HOOKS_DIR/pre-commit.local"
    chmod +x "$HOOKS_DIR/pre-commit.local" 2>/dev/null || true
    echo "→ hook anterior salvo em $HOOKS_DIR/pre-commit.local"
  fi
fi

cat >"$HOOK" <<EOF
#!/usr/bin/env bash
$MARKER
# Gerado por hostdime-ia install-pre-commit.sh — não edite à mão.
set -euo pipefail
export HOSTDIME_IA_ROOT=${HOSTDIME_IA_ROOT@Q}
if [[ -x "\$GIT_DIR/hooks/pre-commit.local" ]]; then
  "\$GIT_DIR/hooks/pre-commit.local" "\$@"
elif [[ -x "\$(dirname "\$0")/pre-commit.local" ]]; then
  "\$(dirname "\$0")/pre-commit.local" "\$@"
fi
exec bash ${PRE_COMMIT_SRC@Q}
EOF

# GIT_DIR no hook: usar path relativo ao hook
# Fix: Git sets GIT_DIR sometimes; use dirname $0
cat >"$HOOK" <<EOF
#!/usr/bin/env bash
$MARKER
# Gerado por hostdime-ia (install-pre-commit.sh). Pular: HOSTDIME_SKIP_PRE_COMMIT=1
set -euo pipefail
HOOK_DIR="\$(cd "\$(dirname "\$0")" && pwd)"
export HOSTDIME_IA_ROOT=${HOSTDIME_IA_ROOT@Q}
if [[ -x "\$HOOK_DIR/pre-commit.local" ]]; then
  "\$HOOK_DIR/pre-commit.local" "\$@" || exit \$?
fi
exec bash ${PRE_COMMIT_SRC@Q}
EOF

chmod +x "$HOOK"
echo "✓ pre-commit instalado em $HOOK"
echo "  projeto: $PROJECT"
echo "  HOSTDIME_IA_ROOT=$HOSTDIME_IA_ROOT"
echo "  desligar: HOSTDIME_SKIP_PRE_COMMIT=1 git commit ..."
echo "  remover:  rm $HOOK"
