#!/usr/bin/env python3
"""Merge hook stop do /historico em hooks.json do projeto (idempotente)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

HISTORICO_MARKERS = ("historico-stop", "history-watch-match")
HISTORICO_COMMAND_UNIX = ".cursor/hooks/historico-stop.sh"
HISTORICO_COMMAND_WIN = (
    "powershell -NoProfile -ExecutionPolicy Bypass "
    "-File .cursor/hooks/historico-stop.ps1"
)


def historico_command() -> str:
    return HISTORICO_COMMAND_WIN if sys.platform == "win32" else HISTORICO_COMMAND_UNIX


def is_historico_command(cmd: str) -> bool:
    return isinstance(cmd, str) and any(m in cmd for m in HISTORICO_MARKERS)


def is_wrong_os_command(cmd: str) -> bool:
    if not is_historico_command(cmd):
        return False
    if sys.platform == "win32":
        return cmd.strip() == HISTORICO_COMMAND_UNIX or (
            "historico-stop.sh" in cmd and "powershell" not in cmd.lower()
        )
    return ".ps1" in cmd or "powershell" in cmd.lower()


def normalize_historico_stop(stop_list: list) -> bool:
    mutated = False
    kept: list = []
    for entry in stop_list:
        if not isinstance(entry, dict):
            kept.append(entry)
            continue
        cmd = entry.get("command", "")
        if is_wrong_os_command(cmd):
            mutated = True
            continue
        kept.append(entry)
    stop_list[:] = kept
    return mutated


def has_historico_stop(stop_list: list) -> bool:
    for entry in stop_list:
        if not isinstance(entry, dict):
            continue
        cmd = entry.get("command", "")
        if is_historico_command(cmd) and not is_wrong_os_command(cmd):
            return True
    return False


def has_enabled_watches(project_root: Path) -> bool:
    watches_path = project_root / ".cursor" / "history" / "watches.json"
    if not watches_path.is_file():
        return False
    try:
        data = json.loads(watches_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    for watch in data.get("watches", []):
        if isinstance(watch, dict) and watch.get("enabled", True):
            return True
    return False


def remove_historico_stop(stop_list: list) -> bool:
    mutated = False
    kept: list = []
    for entry in stop_list:
        if isinstance(entry, dict) and is_historico_command(entry.get("command", "")):
            mutated = True
            continue
        kept.append(entry)
    stop_list[:] = kept
    return mutated


def merge_historico_hooks(hooks_path: Path, project_root: Path | None = None) -> str:
    root = project_root or hooks_path.parent.parent
    enabled = has_enabled_watches(root)

    if hooks_path.exists():
        try:
            data = json.loads(hooks_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError(str(exc)) from exc
        action = "ok"
    else:
        data = {"version": 1, "hooks": {}}
        action = "created"

    if not isinstance(data, dict):
        raise ValueError("hooks.json deve ser um objeto JSON")

    hooks = data.get("hooks")
    if hooks is None:
        hooks = {}
        data["hooks"] = hooks
    if not isinstance(hooks, dict):
        raise ValueError('hooks.json: campo "hooks" inválido')

    stop = hooks.get("stop")
    if stop is None:
        stop = []
        hooks["stop"] = stop
    if not isinstance(stop, list):
        raise ValueError('hooks.json: "stop" deve ser uma lista')

    if normalize_historico_stop(stop) and action == "ok":
        action = "merged"

    if not enabled:
        if remove_historico_stop(stop) and action == "ok":
            action = "merged"
    elif not has_historico_stop(stop):
        stop.append({"command": historico_command(), "loop_limit": 1})
        action = "merged" if action == "ok" else action

    hooks_path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    tmp = hooks_path.with_suffix(".json.tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(hooks_path)
    return action


def main() -> int:
    if len(sys.argv) < 2:
        print(
            "Uso: merge-historico-hooks.py <hooks.json> [project_root]",
            file=sys.stderr,
        )
        return 1

    hooks_path = Path(sys.argv[1])
    project_root = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else None

    try:
        result = merge_historico_hooks(hooks_path, project_root)
        print(result)
    except ValueError as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    main()
