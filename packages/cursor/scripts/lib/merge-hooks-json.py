#!/usr/bin/env python3
"""Injeta sessionStart do hostdime-ia em hooks.json sem remover outros hooks."""
from __future__ import annotations

import json
import sys
from pathlib import Path

HOSTDIME_COMMAND = "./hooks/ensure-project-cursor.sh"
HOSTDIME_MARKERS = ("ensure-project-cursor", "ensure-project-rules")


def has_hostdime_session(session: list) -> bool:
    for entry in session:
        if not isinstance(entry, dict):
            continue
        cmd = entry.get("command", "")
        if isinstance(cmd, str) and any(marker in cmd for marker in HOSTDIME_MARKERS):
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

    if not has_hostdime_session(session):
        session.append({"command": HOSTDIME_COMMAND})
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
