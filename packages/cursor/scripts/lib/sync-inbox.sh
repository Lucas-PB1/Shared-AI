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

sync_inbox_can_gui() {
  command -v zenity >/dev/null 2>&1 && [[ -n "${DISPLAY:-}" ]]
}

sync_inbox_wants_gui() {
  [[ "${SYNC_INBOX_GUI:-}" == "1" ]] && sync_inbox_can_gui
}

sync_inbox_progress_emit() {
  printf '%s\n# %s\n' "$1" "$2"
}

sync_inbox_item_count() {
  python3 - "$1" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
if not p.is_file():
    print(0)
else:
    print(len(json.loads(p.read_text(encoding="utf-8")).get("items") or []))
PY
}

sync_inbox_run_with_progress() {
  local inbox progress_rc=0 count
  inbox="$(sync_inbox_inbox_file)"
  (
    sync_inbox_progress_emit 15 "Buscando projetos com alterações…"
    sync_inbox_scan || exit 1
    count="$(sync_inbox_item_count "$inbox")"
    if [[ "$count" -eq 0 ]]; then
      sync_inbox_progress_emit 100 "Nenhum projeto pendente"
      exit 0
    fi
    sync_inbox_progress_emit 85 "$count projeto(s) com trabalho local"
    sync_inbox_progress_emit 100 "Abrindo menu de retomada…"
  ) | zenity --progress \
      --title="HostDime — O que retomar?" \
      --text="Preparando retomada de trabalho…" \
      --percentage=0 \
      --width=480 \
      --auto-close \
      --no-cancel 2>/dev/null || progress_rc=$?

  if [[ "$progress_rc" -ne 0 ]]; then
    sync_inbox_log "progress zenity cancelado/falhou (rc=$progress_rc)"
    sync_inbox_scan || return 1
  fi
  export SYNC_INBOX_PROGRESS_DONE=1
}

sync_inbox_show_empty_gui() {
  sync_inbox_can_gui || return 0
  zenity --info \
    --title="HostDime — Sync Inbox" \
    --width=380 \
    --text="Nenhum projeto com alterações pendentes.\n\nTodos os repos do sync estão limpos." \
    2>/dev/null || true
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
print(f"O que retomar — {len(items)} projeto(s)\n")
for i, it in enumerate(items, 1):
    summary = it.get("summary") or it.get("objective", "")
    detail = it.get("detail") or ""
    print(f"{i}. {it['name']}")
    print(f"   → {summary}")
    if detail:
        print(f"   ({detail})")
    print()
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

sync_inbox_cards_py() {
  local root="${HOSTDIME_IA_ROOT:-}"
  if [[ -z "$root" && -f "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env" ]]; then
    # shellcheck disable=SC1090
    source "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia.env"
    root="${HOSTDIME_IA_ROOT:-}"
  fi
  if [[ -n "$root" && -f "$root/packages/cursor/scripts/lib/sync-inbox-cards.py" ]]; then
    printf '%s/packages/cursor/scripts/lib/sync-inbox-cards.py' "$root"
    return 0
  fi
  return 1
}

sync_inbox_pick_gui_zenity() {
  local inbox="$1"
  python3 - "$inbox" <<'PY'
import json
import subprocess
import sys
from pathlib import Path

inbox = Path(sys.argv[1])
data = json.loads(inbox.read_text(encoding="utf-8"))
items = data.get("items") or []
if not items:
    sys.exit(0)

rows = []
for it in items:
    summary = it.get("summary") or it.get("objective", "")
    detail = it.get("detail") or f"{it.get('branch', '')} · {it.get('changedCount', 0)} arq."
    card = summary
    if detail:
        card += f"\n{detail}"
    rows.append((it["name"], card[:320], it["path"]))

cmd = [
    "zenity", "--list",
    "--title=HostDime — O que retomar?",
    "--text=Escolha o projeto para continuar no Cursor:",
    "--column=Projeto",
    "--column=Resumo",
    "--column=Path",
    "--hide-column=3",
    "--width=720",
    "--height=480",
]
for name, card, path in rows:
    cmd.extend([name, card, path])

proc = subprocess.run(cmd, capture_output=True, text=True)
if proc.returncode != 0 or not proc.stdout.strip():
    sys.exit(0)
print(proc.stdout.strip().split("\t")[-1])
PY
}

sync_inbox_pick_gui() {
  local inbox="$1" cards_py path
  inbox="${1:-$(sync_inbox_inbox_file)}"
  cards_py="$(sync_inbox_cards_py)" || cards_py=""

  if [[ -n "$cards_py" ]]; then
    local rc=0
    path="$(python3 "$cards_py" "$inbox" 2>/dev/null)" || rc=$?
    if [[ "$rc" -eq 2 ]]; then
      sync_inbox_log "cards GTK indisponível — fallback zenity"
    elif [[ -n "$path" ]]; then
      sync_inbox_open_cursor "$path"
      sync_inbox_log "aberto via cards: $path"
      command -v notify-send >/dev/null 2>&1 && \
        notify-send "Sync Inbox" "Abrindo $(basename "$path") no Cursor" 2>/dev/null || true
      return 0
    else
      return 0
    fi
  fi

  path="$(sync_inbox_pick_gui_zenity "$inbox" || true)"
  [[ -n "$path" ]] || return 0
  sync_inbox_open_cursor "$path"
  sync_inbox_log "aberto via GUI: $path"
  command -v notify-send >/dev/null 2>&1 && \
    notify-send "Sync Inbox" "Abrindo $(basename "$path") no Cursor" 2>/dev/null || true
}

sync_inbox_notify_pending() {
  local count="$1"
  local inbox="$2"
  command -v notify-send >/dev/null 2>&1 || return 0
  local body
  body="$(python3 - "$inbox" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
if not p.is_file():
    print("")
    raise SystemExit
items = json.loads(p.read_text(encoding="utf-8")).get("items") or []
lines = []
for it in items[:3]:
    summary = it.get("summary") or it.get("objective", "")
    if len(summary) > 70:
        summary = summary[:69] + "…"
    lines.append(f"• {it['name']}: {summary}")
if len(items) > 3:
    lines.append(f"… +{len(items) - 3} projeto(s)")
print("\n".join(lines))
PY
)"
  if [[ -n "$body" ]]; then
    notify-send "HostDime — O que retomar?" "$body" 2>/dev/null || true
  else
    notify-send "HostDime Sync Inbox" \
      "$count projeto(s) com alterações — escolha na janela" 2>/dev/null || true
  fi
}

sync_inbox_interactive_pick() {
  local inbox count choice
  inbox="$(sync_inbox_inbox_file)"

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
  [[ "$count" -gt 0 ]] || {
    if sync_inbox_can_gui && [[ "${SYNC_INBOX_PROGRESS_DONE:-}" == "1" || ! -t 0 ]]; then
      sync_inbox_show_empty_gui
    fi
    return 0
  }

  if [[ ! -t 0 ]] || sync_inbox_wants_gui; then
    if sync_inbox_can_gui; then
      [[ "${SYNC_INBOX_PROGRESS_DONE:-}" == "1" ]] || sync_inbox_notify_pending "$count" "$inbox"
      sync_inbox_pick_gui "$inbox"
      return 0
    fi
    sync_inbox_log "inbox gerado ($count projetos) — sem TTY/GUI (instale zenity ou use .desktop autostart)"
    return 0
  fi

  echo "Escolha o número para abrir no Cursor (Enter = pular):"
  sync_inbox_format_report
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
  if [[ ! -t 0 ]] && sync_inbox_can_gui; then
    sync_inbox_run_with_progress || return 1
  elif sync_inbox_wants_gui; then
    sync_inbox_run_with_progress || return 1
  else
    sync_inbox_scan || return 1
  fi
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
  local script gui_script autostart_dir desktop
  script="$(sync_inbox_startup_script)"
  gui_script="$(sync_inbox_startup_gui_script)"
  autostart_dir="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"
  desktop="$autostart_dir/hostdime-ia-sync-inbox.desktop"
  mkdir -p "$autostart_dir"
  cat >"$desktop" <<EOF
[Desktop Entry]
Type=Application
Name=HostDime IA Sync Inbox
Comment=Projetos sync com alterações locais — escolha para abrir no Cursor
Exec=$gui_script
Hidden=false
NoDisplay=false
Terminal=false
X-GNOME-Autostart-enabled=true
X-GNOME-Autostart-Delay=12
EOF
}

sync_inbox_startup_gui_script() {
  printf '%s' "${CURSOR_USER_DIR:-$HOME/.cursor}/hostdime-ia-startup-sync-inbox-gui.sh"
}

sync_inbox_install_gui_script() {
  local dest
  dest="$(sync_inbox_startup_gui_script)"
  cat >"$dest" <<'EOF'
#!/usr/bin/env bash
# Autostart GUI — sync inbox com zenity (sessão gráfica).
set -euo pipefail
CURSOR_DIR="${CURSOR_USER_DIR:-$HOME/.cursor}"
STATE_FILE="$CURSOR_DIR/hostdime-ia/sync-inbox.env"
[[ -f "$STATE_FILE" ]] && source "$STATE_FILE"
[[ "${SYNC_INBOX:-off}" == "on" ]] || exit 0
[[ -n "${DISPLAY:-}" ]] || exit 0
export SYNC_INBOX_GUI=1
LIB="$CURSOR_DIR/hostdime-sync-inbox.sh"
[[ -f "$LIB" ]] && source "$LIB"
sync_inbox_run
EOF
  chmod +x "$dest"
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
  sync_inbox_install_gui_script || return 1
  case "$(uname -s)" in
    Linux)
      sync_inbox_uninstall_systemd
      sync_inbox_install_desktop
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
