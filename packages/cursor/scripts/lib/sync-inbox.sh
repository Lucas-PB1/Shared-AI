#!/usr/bin/env bash
# Sync inbox ao iniciar sessão — scan projetos sync + menu.
# CLI: npm run sync-inbox -- on|off|status|run|scan

sync_inbox_state_file() {
  printf '%s' "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia/sync-inbox.env"
}

sync_inbox_log_file() {
  printf '%s' "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia/sync-inbox.log"
}

sync_inbox_inbox_file() {
  printf '%s' "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia/sync-inbox.json"
}

sync_inbox_startup_script() {
  printf '%s' "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia-startup-sync-inbox.sh"
}

sync_inbox_scan_py() {
  local root="${HOSTDIME_IA_ROOT:-}"
  if [[ -z "$root" && -f "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env" ]]; then
    # shellcheck disable=SC1090
    source "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env"
    root="${HOSTDIME_IA_ROOT:-}"
  fi
  if [[ -n "$root" && -f "$root/packages/cursor/scripts/lib/scan-sync-inbox.py" ]]; then
    printf '%s/packages/cursor/scripts/lib/scan-sync-inbox.py' "$root"
    return 0
  fi
  return 1
}

sync_inbox_ensure_state_dir() {
  mkdir -p "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia"
}

sync_inbox_read_state() {
  local file
  file="$(sync_inbox_state_file)"
  sync_inbox_ensure_state_dir
  [[ -f "$file" ]] || return 0
  # shellcheck disable=SC1090
  source "$file"
}

sync_inbox_write_state() {
  local mode="${1:-off}"
  local asked="${2:-1}"
  sync_inbox_ensure_state_dir
  cat >"$(sync_inbox_state_file)" <<EOF
SYNC_INBOX=$mode
SYNC_INBOX_ASKED=$asked
EOF
}

sync_inbox_read_mode() {
  sync_inbox_read_state
  if [[ -z "${SYNC_INBOX_ASKED:-}" ]]; then
    printf '%s' "unset"
    return
  fi
  printf '%s' "${SYNC_INBOX:-off}"
}

sync_inbox_was_asked() {
  sync_inbox_read_state
  [[ -n "${SYNC_INBOX_ASKED:-}" ]]
}

sync_inbox_log() {
  sync_inbox_ensure_state_dir
  printf '[%s] %s\n' "$(date -Iseconds 2>/dev/null || date)" "$1" >>"$(sync_inbox_log_file)"
}

sync_inbox_scan() {
  local py
  py="$(sync_inbox_scan_py)" || {
    echo "Erro: scan-sync-inbox.py não encontrado" >&2
    return 1
  }
  python3 "$py" >/dev/null
  sync_inbox_log "scan ok ($(sync_inbox_inbox_file))"
}

sync_inbox_format_report() {
  python3 - "$(sync_inbox_inbox_file)" <<'PY'
import json, sys
from pathlib import Path

path = Path(sys.argv[1])
if not path.is_file():
    print("Nenhum projeto com alterações não commitadas.")
    sys.exit(0)
data = json.loads(path.read_text(encoding="utf-8"))
items = data.get("items") or []
if not items:
    print("Nenhum projeto com alterações não commitadas.")
    sys.exit(0)
print(f"Sync inbox — {len(items)} projeto(s) com trabalho local\n")
for i, it in enumerate(items, 1):
    print(f"{i}. {it['name']}  ({it['branch']}) — {it['changedCount']} arquivo(s)")
    print(f"   {it['objective']}")
    print(f"   {it['path']}\n")
PY
}

sync_inbox_open_cursor() {
  local project="$1"
  if command -v cursor >/dev/null 2>&1; then
    cursor "$project" >/dev/null 2>&1 &
    return 0
  fi
  echo "Erro: comando 'cursor' não encontrado no PATH" >&2
  return 1
}

sync_inbox_interactive_pick() {
  local inbox py count choice
  inbox="$(sync_inbox_inbox_file)"
  sync_inbox_format_report

  count="$(python3 - "$inbox" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
if not p.is_file():
    print(0)
    raise SystemExit
data = json.loads(p.read_text(encoding="utf-8"))
print(len(data.get("items") or []))
PY
)"
  [[ "$count" -gt 0 ]] || return 0

  if [[ ! -t 0 ]]; then
    sync_inbox_log "inbox gerado ($count projetos) — terminal não interativo"
    return 0
  fi

  echo "Escolha o número para abrir no Cursor (Enter = pular):"
  read -r choice
  [[ -n "$choice" ]] || return 0
  if ! [[ "$choice" =~ ^[0-9]+$ ]]; then
    echo "Seleção inválida"
    return 1
  fi

  local path
  path="$(python3 - "$inbox" "$choice" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
idx = int(sys.argv[2]) - 1
data = json.loads(p.read_text(encoding="utf-8"))
items = data.get("items") or []
if 0 <= idx < len(items):
    print(items[idx]["path"])
PY
)"
  [[ -n "$path" ]] || {
    echo "Opção inválida"
    return 1
  }
  sync_inbox_open_cursor "$path"
  echo "→ Abrindo: $path"
}

sync_inbox_run() {
  sync_inbox_scan || return 1
  sync_inbox_interactive_pick
}

sync_inbox_install_startup_script() {
  local root src dest
  root="${HOSTDIME_IA_ROOT:-}"
  if [[ -z "$root" && -f "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env" ]]; then
    # shellcheck disable=SC1090
    source "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env"
    root="${HOSTDIME_IA_ROOT:-}"
  fi
  [[ -n "$root" && -d "$root" ]] || {
    echo "Erro: HOSTDIME_IA_ROOT não configurado" >&2
    return 1
  }
  src="$root/packages/cursor/scripts/startup-sync-inbox.sh"
  dest="$(sync_inbox_startup_script)"
  cp "$src" "$dest"
  chmod +x "$dest"
}

sync_inbox_install_desktop() {
  local script autostart_dir desktop
  script="$(sync_inbox_startup_script)"
  autostart_dir="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"
  desktop="$autostart_dir/hostdime-ia-sync-inbox.desktop"
  mkdir -p "$autostart_dir"
  cat >"$desktop" <<EOF
[Desktop Entry]
Type=Application
Name=HostDime IA Sync inbox
Comment=Resume inbox — projetos sync com alterações locais
Exec=$script
Hidden=false
NoDisplay=false
Terminal=true
X-GNOME-Autostart-enabled=true
EOF
}

sync_inbox_uninstall_desktop() {
  rm -f "${XDG_CONFIG_HOME:-$HOME/.config}/autostart/hostdime-ia-sync-inbox.desktop"
}

sync_inbox_install_systemd() {
  local script unit_dir unit
  script="$(sync_inbox_startup_script)"
  unit_dir="$HOME/.config/systemd/user"
  unit="$unit_dir/hostdime-ia-sync-inbox.service"
  mkdir -p "$unit_dir"
  cat >"$unit" <<EOF
[Unit]
Description=HostDime IA — sync-inbox trabalho ao iniciar sessão
After=graphical-session.target
Wants=graphical-session.target

[Service]
Type=oneshot
ExecStart=$script
Environment=HOME=$HOME
Environment=DISPLAY=${DISPLAY:-:0}
Environment=PATH=$PATH

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable hostdime-ia-sync-inbox.service
}

sync_inbox_uninstall_systemd() {
  systemctl --user disable hostdime-ia-sync-inbox.service 2>/dev/null || true
  rm -f "$HOME/.config/systemd/user/hostdime-ia-sync-inbox.service"
  systemctl --user daemon-reload 2>/dev/null || true
}

sync_inbox_install_hook() {
  sync_inbox_install_startup_script || return 1
  case "$(uname -s)" in
    Linux)
      if command -v systemctl >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1; then
        sync_inbox_install_systemd
      else
        sync_inbox_install_desktop
      fi
      ;;
    *)
      sync_inbox_install_desktop
      ;;
  esac
}

sync_inbox_uninstall_hook() {
  sync_inbox_uninstall_systemd
  sync_inbox_uninstall_desktop
  rm -f "$(sync_inbox_startup_script)"
}

sync_inbox_enable() {
  sync_inbox_write_state "on" "1"
  sync_inbox_install_hook
  echo "Sync inbox: ON — scan ao iniciar sessão (projetos do sync)"
  echo "Log: $(sync_inbox_log_file)"
  echo "Inbox: $(sync_inbox_inbox_file)"
}

sync_inbox_disable() {
  sync_inbox_write_state "off" "1"
  sync_inbox_uninstall_hook
  echo "Sync inbox: OFF"
}

sync_inbox_status() {
  local mode
  mode="$(sync_inbox_read_mode)"
  case "$mode" in
    on) echo "Sync inbox: ON" ;;
    off) echo "Sync inbox: OFF" ;;
    unset) echo "Sync inbox: não configurado" ;;
  esac
  echo "Inbox: $(sync_inbox_inbox_file)"
  echo "Log: $(sync_inbox_log_file)"
  if [[ -f "$(sync_inbox_inbox_file)" ]]; then
    sync_inbox_format_report
  fi
}

sync_inbox_prompt_if_needed() {
  [[ "${HOSTDIME_SYNC_INBOX_PROMPT:-}" == "skip" ]] && return 0
  sync_inbox_was_asked && return 0
  [[ -t 0 ]] || return 0
  echo ""
  echo "Mostrar inbox de retomada ao iniciar o computador?"
  echo "  (projetos do sync com git dirty — npm run sync-inbox -- off)"
  local ans
  read -r -p "[s/N] " ans
  case "${ans,,}" in
    s | sim | y | yes) sync_inbox_enable ;;
    *) sync_inbox_disable ;;
  esac
}
