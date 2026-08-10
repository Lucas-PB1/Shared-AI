#!/usr/bin/env bash
# Instalação e configuração do Cursor CLI (agent) — modo auto (approval unrestricted).
# Source: packages/cursor/scripts/lib/install/cursor-cli.sh
# CLI: npm run cursor-cli -- [install|configure|status|login]

cursor_cli_state_file() {
  printf '%s' "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-cursor-cli.state"
}

cursor_cli_config_file() {
  printf '%s' "${CURSOR_USER_DIR:-$HOME/.cursor}/cli-config.json"
}

cursor_cli_agent_candidates() {
  printf '%s\n' \
    "${HOME}/.local/bin/agent" \
    "${HOME}/.cursor/bin/agent" \
    "/usr/local/bin/agent"
}

cursor_cli_resolve_lib() {
  local script_dir="${1:?}"
  if [[ -f "$script_dir/lib/install/cursor-cli.sh" ]]; then
    printf '%s/lib/install/cursor-cli.sh' "$script_dir"
    return 0
  fi
  if [[ -f "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-cursor-cli.sh" ]]; then
    printf '%s/hostdime-cursor-cli.sh' "${CURSOR_USER_DIR:-$HOME/.cursor}"
    return 0
  fi
  if [[ -n "${HOSTDIME_IA_ROOT:-}" && -f "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/cursor-cli.sh" ]]; then
    printf '%s/packages/cursor/scripts/lib/install/cursor-cli.sh' "$HOSTDIME_IA_ROOT"
    return 0
  fi
  local env_file="${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env"
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    source "$env_file"
    if [[ -n "${HOSTDIME_IA_ROOT:-}" && -f "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/install/cursor-cli.sh" ]]; then
      printf '%s/packages/cursor/scripts/lib/install/cursor-cli.sh' "$HOSTDIME_IA_ROOT"
      return 0
    fi
  fi
  return 1
}

cursor_cli_find_agent() {
  local candidate
  cursor_cli_agent_env
  if command -v agent >/dev/null 2>&1; then
    command -v agent
    return 0
  fi
  while IFS= read -r candidate; do
    [[ -x "$candidate" ]] || continue
    printf '%s' "$candidate"
    return 0
  done < <(cursor_cli_agent_candidates)
  return 1
}

cursor_cli_agent_env() {
  export PATH="${HOME}/.local/bin:${HOME}/.cursor/bin:${PATH}"
}

cursor_cli_is_logged_in() {
  local agent_bin status_line
  if [[ -n "${CURSOR_API_KEY:-}" ]]; then
    return 0
  fi
  agent_bin="$(cursor_cli_find_agent 2>/dev/null || true)"
  [[ -n "$agent_bin" ]] || return 1
  status_line="$("$agent_bin" status 2>/dev/null || true)"
  [[ "$status_line" == *"Logged in"* ]]
}

cursor_cli_ensure_login() {
  local skip="${1:-0}"
  if [[ "$skip" -eq 1 ]]; then
    return 0
  fi
  if cursor_cli_is_logged_in; then
    local agent_bin msg
    agent_bin="$(cursor_cli_find_agent)"
    msg="$("$agent_bin" status 2>/dev/null | head -1 || true)"
    echo "→ Login: ${msg:-ok}"
    return 0
  fi
  if [[ -n "${CURSOR_API_KEY:-}" ]]; then
    echo "→ Login: CURSOR_API_KEY definida (headless/CI)"
    return 0
  fi
  local agent_bin
  agent_bin="$(cursor_cli_find_agent)" || {
    echo "Erro: agent não encontrado para login" >&2
    return 1
  }
  echo "→ Login: autentique no browser (uma vez por máquina)..."
  "$agent_bin" login
}

cursor_cli_ensure_path_profile() {
  local marker="# hostdime-ia cursor-cli PATH"
  local line='export PATH="$HOME/.local/bin:$HOME/.cursor/bin:$PATH"'
  local rc
  for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
    [[ -f "$rc" ]] || continue
    if grep -qF "$marker" "$rc" 2>/dev/null; then
      continue
    fi
    printf '\n%s\n%s\n' "$marker" "$line" >>"$rc"
    echo "→ PATH adicionado em $rc"
  done
}

cursor_cli_read_status() {
  local state_file
  state_file="$(cursor_cli_state_file)"
  [[ -f "$state_file" ]] || return 0
  # shellcheck disable=SC1090
  source "$state_file"
  printf '%s' "${STATUS:-}"
}

cursor_cli_write_status() {
  local status="$1"
  local state_file cursor_dir
  cursor_dir="${CURSOR_USER_DIR:-$HOME/.cursor}"
  state_file="$(cursor_cli_state_file)"
  mkdir -p "$cursor_dir"
  printf 'STATUS=%s\nCONFIGURED=%s\n' "$status" "${2:-}" >"$state_file"
}

cursor_cli_template_file() {
  local root="${HOSTDIME_IA_ROOT:-}"
  if [[ -z "$root" ]]; then
    local env_file="${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env"
    if [[ -f "$env_file" ]]; then
      # shellcheck disable=SC1090
      source "$env_file"
      root="${HOSTDIME_IA_ROOT:-}"
    fi
  fi
  if [[ -n "$root" && -f "$root/packages/cursor/templates/cli-config.auto.json" ]]; then
    printf '%s/packages/cursor/templates/cli-config.auto.json' "$root"
    return 0
  fi
  return 1
}

cursor_cli_merge_ts() {
  local root="${HOSTDIME_IA_ROOT:-}"
  if [[ -z "$root" ]]; then
    local env_file="${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env"
    [[ -f "$env_file" ]] && source "$env_file"
    root="${HOSTDIME_IA_ROOT:-}"
  fi
  if [[ -n "$root" && -f "$root/packages/cursor/scripts/lib/install/merge-cursor-cli-config.ts" ]]; then
    printf '%s/packages/cursor/scripts/lib/install/merge-cursor-cli-config.ts' "$root"
    return 0
  fi
  return 1
}

cursor_cli_configure_auto() {
  local template ts config result
  config="$(cursor_cli_config_file)"
  template="$(cursor_cli_template_file)" || {
    echo "Erro: template cli-config.auto.json não encontrado (HOSTDIME_IA_ROOT?)" >&2
    return 1
  }
  ts="$(cursor_cli_merge_ts)" || {
    echo "Erro: merge-cursor-cli-config.ts não encontrado" >&2
    return 1
  }
  # shellcheck disable=SC1091
  source "$(dirname "${BASH_SOURCE[0]}")/hostdime-env.sh"
  result="$(hostdime_tsx "$ts" "$config" "$template")"
  cursor_cli_write_status "configured" "auto"
  printf '%s\n' "$result"
}

cursor_cli_install_binary() {
  local dry_run="${1:-0}"
  if cursor_cli_find_agent >/dev/null; then
    echo "agent já instalado: $(cursor_cli_find_agent)"
    return 0
  fi
  if [[ "$dry_run" -eq 1 ]]; then
    echo "dry-run: curl https://cursor.com/install -fsS | bash"
    return 0
  fi
  echo "→ Instalando Cursor CLI (agent)..."
  curl https://cursor.com/install -fsS | bash
}

cursor_cli_ensure_path_hint() {
  local agent_bin path_dir
  agent_bin="$(cursor_cli_find_agent 2>/dev/null || true)"
  [[ -n "$agent_bin" ]] || return 0
  path_dir="$(dirname "$agent_bin")"
  case ":$PATH:" in
    *":$path_dir:"*) return 0 ;;
  esac
  echo ""
  echo "Adicione ao PATH (se agent não for encontrado em novos terminais):"
  echo "  export PATH=\"$path_dir:\$PATH\""
  echo "  # bash: echo 'export PATH=\"$path_dir:\$PATH\"' >> ~/.bashrc"
  echo "  # zsh:  echo 'export PATH=\"$path_dir:\$PATH\"' >> ~/.zshrc"
}

cursor_cli_status_report() {
  local agent_bin config auth_line version_line approval
  agent_bin="$(cursor_cli_find_agent 2>/dev/null || true)"
  config="$(cursor_cli_config_file)"

  echo "Cursor CLI — status"
  echo "  agent: ${agent_bin:-não encontrado}"
  if [[ -n "$agent_bin" ]]; then
    version_line="$("$agent_bin" --version 2>/dev/null || true)"
    [[ -n "$version_line" ]] && echo "  version: $version_line"
    auth_line="$("$agent_bin" status 2>/dev/null | head -5 || true)"
    [[ -n "$auth_line" ]] && echo "  auth:" && echo "$auth_line" | sed 's/^/    /'
  fi
  if [[ -f "$config" ]]; then
    approval="$(node --input-type=module -e '
import { readFileSync } from "node:fs";
try {
  const data = JSON.parse(readFileSync(process.argv[1], "utf-8"));
  process.stdout.write(data.approvalMode ?? "(unset)");
} catch {
  process.stdout.write("(erro ao ler)");
}
' "$config")"
    echo "  cli-config: $config"
    echo "  approvalMode: $approval"
  else
    echo "  cli-config: ausente ($config)"
  fi
  echo "  hostdime state: $(cursor_cli_read_status || echo unset)"
}

cursor_cli_login() {
  local agent_bin
  agent_bin="$(cursor_cli_find_agent)" || {
    echo "Erro: agent não encontrado. Rode install primeiro." >&2
    return 1
  }
  exec "$agent_bin" login
}

cursor_cli_install_and_configure() {
  local dry_run="${1:-0}"
  local skip_login="${2:-0}"
  cursor_cli_install_binary "$dry_run"
  if [[ "$dry_run" -eq 1 ]]; then
    echo "dry-run: merge cli-config auto (approvalMode=unrestricted)"
    echo "dry-run: ensure PATH + login"
    return 0
  fi
  cursor_cli_agent_env
  cursor_cli_configure_auto
  cursor_cli_ensure_path_profile
  cursor_cli_ensure_login "$skip_login"
  cursor_cli_write_status "installed" "auto"
  echo ""
  echo "Pronto: modo auto (Run Everything) = approvalMode unrestricted"
  echo "Uso:     agent              # de qualquer pasta (PATH no shell)"
  echo "         npm run agent -- \"prompt\"   # com relink hostdime"
}

cursor_cli_find_project_root() {
  local start="${1:-.}"
  start="$(cd "$start" && pwd)"
  local dir="$start"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.cursor" ]]; then
      printf '%s' "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  printf '%s' "$start"
}

cursor_cli_prepare_project() {
  local root="$1"
  local link_script registry
  link_script="${CURSOR_LINK_PROJECT_SCRIPT:-${CURSOR_LINK_RULES_SCRIPT:-$HOME/.cursor/link-project.sh}}"
  if [[ -x "$link_script" ]]; then
    "$link_script" --quiet "$root" 2>/dev/null || true
  fi
  registry="${HOME}/.cursor/hostdime-projects-registry.sh"
  if [[ -x "$registry" ]]; then
    # shellcheck disable=SC1091
    source "$registry"
    register_project "$root" 2>/dev/null || true
  fi
}

cursor_cli_run_agent() {
  local dry_run=0
  local project=""
  local hostdime_auto=1
  local -a agent_args=()
  local arg

  while [[ $# -gt 0 ]]; do
    arg="$1"
    case "$arg" in
      --dry-run)
        dry_run=1
        shift
        ;;
      --no-auto)
        hostdime_auto=0
        shift
        ;;
      --project=*)
        project="${arg#--project=}"
        shift
        ;;
      --project)
        project="${2:?Informe o caminho do projeto}"
        shift 2
        ;;
      --)
        shift
        agent_args+=("$@")
        break
        ;;
      *)
        agent_args+=("$arg")
        shift
        ;;
    esac
  done

  cursor_cli_agent_env

  local agent_bin
  agent_bin="$(cursor_cli_find_agent 2>/dev/null || true)"
  if [[ -z "$agent_bin" && "$dry_run" -eq 0 ]]; then
    echo "Erro: agent não encontrado. Rode: npm run cursor-cli -- install" >&2
    return 1
  fi

  local -a hostdime_defaults=()
  if [[ "$hostdime_auto" -eq 1 ]]; then
    hostdime_defaults=(--approve-mcps)
    local has_print=0 has_force=0
    for a in "${agent_args[@]}"; do
      [[ "$a" == "-p" || "$a" == "--print" ]] && has_print=1
      [[ "$a" == "-f" || "$a" == "--force" || "$a" == "--yolo" ]] && has_force=1
    done
    if [[ "$has_print" -eq 1 && "$has_force" -eq 0 ]]; then
      hostdime_defaults+=(--force)
    fi
  fi

  local start_dir="${project:-$PWD}"
  local root
  root="$(cursor_cli_find_project_root "$start_dir")"

  if [[ "$dry_run" -eq 1 ]]; then
    echo "project: $root"
    echo "agent: ${agent_bin:-não instalado}"
    echo "defaults: ${hostdime_defaults[*]-"(nenhum)"}"
    echo "args: ${agent_args[*]-"(interativo)"}"
    return 0
  fi

  if ! cursor_cli_is_logged_in; then
    echo "Erro: não autenticado. Rode: npm run cursor-cli -- login" >&2
    return 1
  fi

  cursor_cli_prepare_project "$root"
  cd "$root"
  exec "$agent_bin" "${hostdime_defaults[@]}" "${agent_args[@]}"
}
