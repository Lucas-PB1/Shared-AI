#!/usr/bin/env bash
# Aplica perfil de bootstrap (SKILLS-ROUTING + rule do projeto).
#
# Source: source .../apply-bootstrap-profile.sh
#         apply_bootstrap_profile /caminho/repo laravel

apply_bootstrap_profile() {
  local project="$1"
  local profile="$2"
  local root="${HOSTDIME_IA_ROOT:-}"
  local profile_dir

  [[ -n "$profile" ]] || return 0
  [[ -n "$root" && -d "$root" ]] || {
    echo "Erro: HOSTDIME_IA_ROOT não configurado" >&2
    return 1
  }

  profile_dir="$root/packages/cursor/profiles/$profile"
  if [[ ! -d "$profile_dir" ]]; then
    echo "Erro: perfil desconhecido: $profile" >&2
    echo "Perfis disponíveis: laravel, hubspot, react" >&2
    return 1
  fi

  echo "→ perfil: $profile"

  local f base dest
  for f in "$profile_dir"/*; do
    [[ -e "$f" ]] || continue
    base="$(basename "$f")"

    case "$base" in
      SKILLS-ROUTING.md)
        dest="$project/.cursor/SKILLS-ROUTING.md"
        mkdir -p "$project/.cursor"
        if [[ -f "$dest" ]]; then
          echo "  preservado: .cursor/SKILLS-ROUTING.md (já existe)"
        else
          cp "$f" "$dest"
          echo "  criado: .cursor/SKILLS-ROUTING.md"
        fi
        ;;
      *.mdc)
        dest="$project/.cursor/rules/$base"
        mkdir -p "$project/.cursor/rules"
        if [[ -e "$dest" ]]; then
          echo "  preservado: .cursor/rules/$base (já existe)"
        else
          cp "$f" "$dest"
          echo "  criado: .cursor/rules/$base"
        fi
        ;;
      README.md) ;;
      *)
        echo "  ignorado: $base (tipo não gerenciado)"
        ;;
    esac
  done
}
