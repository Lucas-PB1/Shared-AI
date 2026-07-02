#!/usr/bin/env python3
"""Merge hostdime auto config into ~/.cursor/cli-config.json."""
from __future__ import annotations

import json
import sys
from pathlib import Path


def merge_config(existing: dict, template: dict) -> tuple[dict, bool]:
    merged = dict(existing)
    mutated = False

    for key, value in template.items():
        if key == "permissions":
            perms = dict(merged.get("permissions") or {})
            tpl_perms = value if isinstance(value, dict) else {}
            deny = list(perms.get("deny") or [])
            tpl_deny = tpl_perms.get("deny") or []
            for item in tpl_deny:
                if item not in deny:
                    deny.append(item)
                    mutated = True
            perms["deny"] = deny
            if "allow" not in perms:
                perms["allow"] = tpl_perms.get("allow") or []
                mutated = True
            merged["permissions"] = perms
            continue

        if key not in merged:
            merged[key] = value
            mutated = True
            continue

        if key == "approvalMode" and merged.get(key) != value:
            merged[key] = value
            mutated = True

    if merged.get("version") != template.get("version"):
        merged["version"] = template.get("version", 1)
        mutated = True

    if "editor" not in merged:
        merged["editor"] = template.get("editor", {"vimMode": False})
        mutated = True

    return merged, mutated


def apply_auto_config(config_path: Path, template_path: Path) -> str:
    template = json.loads(template_path.read_text(encoding="utf-8"))

    if config_path.exists():
        try:
            existing = json.loads(config_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError(f"{config_path}: JSON inválido ({exc})") from exc
        if not isinstance(existing, dict):
            raise ValueError(f"{config_path}: raiz deve ser objeto JSON")
        merged, mutated = merge_config(existing, template)
        action = "merged" if mutated else "ok"
    else:
        merged = template
        action = "created"

    config_path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(merged, indent=2, ensure_ascii=False) + "\n"
    tmp = config_path.with_suffix(".json.tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(config_path)
    return action


def main() -> int:
    if len(sys.argv) < 3:
        print(
            "Uso: merge-cursor-cli-config.py <cli-config.json> <template.json>",
            file=sys.stderr,
        )
        return 1

    config_path = Path(sys.argv[1])
    template_path = Path(sys.argv[2])

    try:
        print(apply_auto_config(config_path, template_path))
    except (OSError, ValueError) as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
