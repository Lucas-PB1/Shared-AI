#!/usr/bin/env python3
"""Injeta sessionStart do hostdime-ia em hooks.json sem remover outros hooks."""
from __future__ import annotations

import json
import sys
from pathlib import Path

HOSTDIME_COMMAND_UNIX = "./hooks/ensure-project-cursor.sh"
HOSTDIME_COMMAND_WIN = (
    "powershell -NoProfile -ExecutionPolicy Bypass -File ./hooks/ensure-project-cursor.ps1"
)
HOSTDIME_MARKERS = ("ensure-project-cursor", "ensure-project-rules")


def hostdime_command() -> str:
    return HOSTDIME_COMMAND_WIN if sys.platform == "win32" else HOSTDIME_COMMAND_UNIX


def is_hostdime_command(cmd: str) -> bool:
    return isinstance(cmd, str) and any(marker in cmd for marker in HOSTDIME_MARKERS)


def is_wrong_os_command(cmd: str) -> bool:
    if not is_hostdime_command(cmd):
        return False
    if sys.platform == "win32":
        return cmd.strip() == HOSTDIME_COMMAND_UNIX or (
            cmd.endswith(".sh") and "ensure-project-cursor" in cmd
        )
    return ".ps1" in cmd or "powershell" in cmd.lower()


def normalize_hostdime_session(session: list) -> bool:
    """Remove entrada hostdime do OS errado. Retorna True se mutou."""
    mutated = False
    kept: list = []
    for entry in session:
        if not isinstance(entry, dict):
            kept.append(entry)
            continue
        cmd = entry.get("command", "")
        if is_wrong_os_command(cmd):
            mutated = True
            continue
        kept.append(entry)
    session[:] = kept
    return mutated


def has_hostdime_session(session: list) -> bool:
    for entry in session:
        if not isinstance(entry, dict):
            continue
        cmd = entry.get("command", "")
        if is_hostdime_command(cmd) and not is_wrong_os_command(cmd):
            return True
    return False


def merge_hooks(hooks_path: Path, example_path: Path | None) -> str:
    if hooks_path.exists():
        try:
            data = json.loads(hooks_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError(str(exc)) from exc
        action = "ok"
    elif example_path and example_path.exists():
        data = json.loads(example_path.read_text(encoding="utf-8"))
        action = "created"
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

    session = hooks.get("sessionStart")
    if session is None:
        session = []
        hooks["sessionStart"] = session
    if not isinstance(session, list):
        raise ValueError('hooks.json: "sessionStart" deve ser uma lista')

    if normalize_hostdime_session(session) and action == "ok":
        action = "merged"

    if not has_hostdime_session(session):
        session.append({"command": hostdime_command()})
        if action == "ok":
            action = "merged"

    hooks_path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    tmp = hooks_path.with_suffix(".json.tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(hooks_path)
    return action


def main() -> int:
    if len(sys.argv) < 2:
        print("Uso: merge-hooks-json.py <hooks.json> [hooks.json.example]", file=sys.stderr)
        return 1

    hooks_path = Path(sys.argv[1])
    example_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None

    try:
        print(merge_hooks(hooks_path, example_path))
    except ValueError as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
