#!/usr/bin/env python3
"""Detecta perfil de bootstrap a partir de manifestos na raiz do projeto."""
from __future__ import annotations

import json
import sys
from pathlib import Path


def read_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def package_deps(pkg_path: Path) -> dict[str, str]:
    data = read_json(pkg_path)
    if not data:
        return {}
    deps: dict[str, str] = {}
    for key in ("dependencies", "devDependencies", "peerDependencies"):
        deps.update(data.get(key) or {})
    return deps


def detect_profile(root: Path) -> str:
    root = root.resolve()

    if (root / "hsproject.json").is_file():
        return "hubspot"

    composer = read_json(root / "composer.json")
    if composer:
        require = {**(composer.get("require") or {}), **(composer.get("require-dev") or {})}
        if "laravel/framework" in require:
            return "laravel"
        for pkg in require:
            if pkg.startswith("laminas/") or pkg.startswith("zendframework/"):
                return "zend-laminas"

    pkg = root / "package.json"
    if pkg.is_file():
        deps = package_deps(pkg)
        if "next" in deps:
            return "next"
        if "react" in deps or "react-dom" in deps:
            return "react"
        if "@hubspot/cms-components" in deps or "@hubspot/cli" in deps:
            return "hubspot"

    for marker in ("pyproject.toml", "requirements.txt", "setup.py"):
        if (root / marker).is_file():
            return "python"

    return ""


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: detect-stack.py /caminho/do/projeto", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    if not path.is_dir():
        print("", end="")
        return 1
    print(detect_profile(path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
