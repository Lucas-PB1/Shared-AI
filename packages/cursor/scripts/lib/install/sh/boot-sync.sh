#!/usr/bin/env bash
# Sync automático ao iniciar o computador (git pull + npm run sync).
#
# Source: source .../boot-sync.sh
# CLI:    npm run boot-sync -- on|off|status|run

boot_sync_state_file() {
  printf '%s' "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia/boot-sync.env"
}

boot_sync_log_file() {
  printf '%s' "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia/boot-sync.log"
}

boot_sync_startup_script() {
  printf '%s' "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia-startup-sync.sh"
}

boot_sync_ensure_state_dir() {
  mkdir -p "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia"
}

boot_sync_read_state() {
  local file key val
  file="$(boot_sync_state_file)"
  boot_sync_ensure_state_dir
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^([A-Z_]+)=(.*)$ ]] || continue
    key="${BASH_REMATCH[1]}"
    val="${BASH_REMATCH[2]}"
    printf -v "$key" '%s' "$val"
    export "$key"
  done <"$file"
}

boot_sync_write_state() {
  local mode="${1:-off}"
  local asked="${2:-1}"
  boot_sync_ensure_state_dir
  cat >"$(boot_sync_state_file)" <<EOF
BOOT_SYNC=$mode
BOOT_SYNC_ASKED=$asked
EOF
}

boot_sync_read_mode() {
  boot_sync_read_state
  if [[ -z "${BOOT_SYNC_ASKED:-}" ]]; then
    printf '%s' "unset"
    return
  fi
  printf '%s' "${BOOT_SYNC:-off}"
}

boot_sync_was_asked() {
  boot_sync_read_state
  [[ -n "${BOOT_SYNC_ASKED:-}" ]]
}

boot_sync_mark_asked() {
  local mode="${BOOT_SYNC:-off}"
  boot_sync_read_state
  boot_sync_write_state "${BOOT_SYNC:-off}" "1"
}

boot_sync_log() {
  local msg="$1"
  local file
  boot_sync_ensure_state_dir
  file="$(boot_sync_log_file)"
  # Rotaciona se passar de ~1 MB (mantém 1 backup) — evita crescimento sem limite.
  if [[ -f "$file" ]] && (($(wc -c <"$file" 2>/dev/null || echo 0) > 1048576)); then
    mv -f "$file" "$file.1"
  fi
  printf '[%s] %s\n' "$(date -Iseconds 2>/dev/null || date)" "$msg" >>"$file"
}

boot_sync_install_startup_script() {
  local root src dest
  root="${HOSTDIME_IA_ROOT:-}"
  if [[ -z "$root" || ! -d "$root" ]]; then
    # shellcheck disable=SC1091
    source "$(dirname "${BASH_SOURCE[0]}")/hostdime-env.sh"
    root="$(hostdime_resolve_root 2>/dev/null || true)"
  fi
  [[ -n "$root" && -d "$root" ]] || {
    echo "Erro: HOSTDIME_IA_ROOT não configurado" >&2
    return 1
  }
  src="$root/packages/cursor/scripts/startup-sync.sh"
  dest="$(boot_sync_startup_script)"
  [[ -f "$src" ]] || {
    echo "Erro: startup-sync.sh não encontrado em $src" >&2
    return 1
  }
  cp "$src" "$dest"
  chmod +x "$dest"
}

boot_sync_uninstall_systemd() {
  if command -v systemctl >/dev/null 2>&1; then
    systemctl --user disable hostdime-ia-boot-sync.service 2>/dev/null || true
    systemctl --user stop hostdime-ia-boot-sync.service 2>/dev/null || true
  fi
  rm -f "$HOME/.config/systemd/user/hostdime-ia-boot-sync.service"
  systemctl --user daemon-reload 2>/dev/null || true
}

boot_sync_install_systemd() {
  local script unit_dir unit
  script="$(boot_sync_startup_script)"
  unit_dir="$HOME/.config/systemd/user"
  unit="$unit_dir/hostdime-ia-boot-sync.service"
  mkdir -p "$unit_dir"
  cat >"$unit" <<EOF
[Unit]
Description=HostDime IA — git pull e sync ao iniciar sessão
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=$script
Environment=HOME=$HOME
Environment=PATH=$PATH

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable hostdime-ia-boot-sync.service
}

boot_sync_uninstall_desktop() {
  rm -f "${XDG_CONFIG_HOME:-$HOME/.config}/autostart/hostdime-ia-boot-sync.desktop"
}

boot_sync_install_desktop() {
  local script autostart_dir desktop
  script="$(boot_sync_startup_script)"
  autostart_dir="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"
  desktop="$autostart_dir/hostdime-ia-boot-sync.desktop"
  mkdir -p "$autostart_dir"
  cat >"$desktop" <<EOF
[Desktop Entry]
Type=Application
Name=HostDime IA Boot Sync
Comment=git pull e sync do hostdime-ia ao iniciar sessão
Exec=$script
Hidden=true
NoDisplay=true
X-GNOME-Autostart-enabled=true
EOF
}

boot_sync_install_hook() {
  boot_sync_install_startup_script || return 1

  case "$(uname -s)" in
    Linux)
      if command -v systemctl >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1; then
        boot_sync_install_systemd
      else
        boot_sync_install_desktop
      fi
      ;;
    *)
      echo "Erro: boot-sync bash só é suportado em Linux (detectado: $(uname -s))." >&2
      echo "No Windows use: npm run boot-sync (PowerShell / Task Scheduler)." >&2
      return 1
      ;;
  esac
}

boot_sync_uninstall_hook() {
  boot_sync_uninstall_systemd
  boot_sync_uninstall_desktop
  rm -f "$(boot_sync_startup_script)"
}

boot_sync_hook_kind() {
  local desktop unit
  desktop="${XDG_CONFIG_HOME:-$HOME/.config}/autostart/hostdime-ia-boot-sync.desktop"
  unit="$HOME/.config/systemd/user/hostdime-ia-boot-sync.service"

  [[ -f "$unit" ]] && { printf '%s' "systemd user"; return; }
  [[ -f "$desktop" ]] && { printf '%s' "autostart desktop"; return; }
  printf '%s' "não instalado"
}

boot_sync_enable() {
  boot_sync_write_state "on" "1"
  boot_sync_install_hook
  echo "Boot sync: ON — git pull + sync ao iniciar sessão"
  echo "Log: $(boot_sync_log_file)"
}

boot_sync_disable() {
  boot_sync_write_state "off" "1"
  boot_sync_uninstall_hook
  echo "Boot sync: OFF"
}

boot_sync_status() {
  local mode kind
  mode="$(boot_sync_read_mode)"
  kind="$(boot_sync_hook_kind)"

  case "$mode" in
    on) echo "Boot sync: ON" ;;
    off) echo "Boot sync: OFF" ;;
    unset) echo "Boot sync: não configurado (pergunta na próxima sync interativa)" ;;
  esac
  echo "Agendamento: $kind"
  echo "Log: $(boot_sync_log_file)"
}

boot_sync_run() {
  local script
  script="$(boot_sync_startup_script)"
  if [[ -x "$script" ]]; then
    exec "$script"
  fi
  # fallback: repo copy (antes do primeiro enable)
  local root="${HOSTDIME_IA_ROOT:-}"
  if [[ -z "$root" ]]; then
    # shellcheck disable=SC1091
    source "$(dirname "${BASH_SOURCE[0]}")/hostdime-env.sh"
    root="$(hostdime_resolve_root 2>/dev/null || true)"
  fi
  [[ -n "$root" && -x "$root/packages/cursor/scripts/startup-sync.sh" ]] || {
    echo "Erro: script de startup não encontrado" >&2
    return 1
  }
  exec "$root/packages/cursor/scripts/startup-sync.sh"
}

boot_sync_prompt_if_needed() {
  [[ "${HOSTDIME_BOOT_SYNC_PROMPT:-}" == "skip" ]] && return 0
  boot_sync_was_asked && return 0
  [[ -t 0 ]] || return 0

  echo ""
  echo "Sincronizar HostDime IA automaticamente ao iniciar o computador?"
  echo "  (git pull + npm run sync no clone — pode ser desligado com: npm run boot-sync -- off)"
  local ans
  read -r -p "[s/N] " ans
  case "${ans,,}" in
    s | sim | y | yes)
      boot_sync_enable
      ;;
    *)
      boot_sync_disable
      ;;
  esac
}
