#!/usr/bin/env python3
"""Match paths against .cursor/history/watches.json scopes."""
from __future__ import annotations

import fnmatch
import json
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath


def normalize_path(path: str) -> str:
    return PurePosixPath(path.replace("\\", "/").lstrip("./")).as_posix()


def scope_to_glob(scope: str, scope_kind: str) -> str:
    scope = normalize_path(scope)
    if scope_kind == "file":
        return scope
    if scope_kind == "dir":
        return scope.rstrip("/") + "/**"
    return scope


def path_matches(path: str, scope: str, scope_kind: str) -> bool:
    path = normalize_path(path)
    scope = normalize_path(scope)
    if scope_kind == "file":
        return path == scope

    glob_pattern = scope_to_glob(scope, scope_kind)
    if "**" in glob_pattern:
        prefix = glob_pattern.split("**", 1)[0].rstrip("/")
        if prefix and not (path == prefix or path.startswith(prefix + "/")):
            return False
        suffix = glob_pattern[len(prefix) :].lstrip("/")
        if suffix in ("", "**", "**/*"):
            return True
        tail = path[len(prefix) + 1 :] if prefix else path
        return fnmatch.fnmatch(tail, suffix.replace("**/", ""))

    return fnmatch.fnmatch(path, glob_pattern) or fnmatch.fnmatch(
        PurePosixPath(path).name, glob_pattern
    )


def load_watches(watches_path: Path) -> dict:
    if not watches_path.is_file():
        return {"version": 1, "watches": []}
    data = json.loads(watches_path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("watches.json deve ser um objeto JSON")
    if data.get("version") != 1:
        raise ValueError("watches.json: version deve ser 1")
    watches = data.get("watches")
    if not isinstance(watches, list):
        raise ValueError('watches.json: "watches" deve ser uma lista')
    return data


def validate_watches(data: dict) -> list[str]:
    errors: list[str] = []
    id_re = re.compile(r"^[a-z0-9][a-z0-9-]*$")
    watches = data.get("watches", [])
    seen: set[str] = set()
    for i, watch in enumerate(watches):
        prefix = f"watches[{i}]"
        if not isinstance(watch, dict):
            errors.append(f"{prefix}: deve ser objeto")
            continue
        for key in ("id", "scope", "scopeKind", "historyFile", "format", "enabled"):
            if key not in watch:
                errors.append(f"{prefix}: falta campo '{key}'")
        wid = watch.get("id", "")
        if not isinstance(wid, str) or not id_re.match(wid):
            errors.append(f"{prefix}: id inválido '{wid}'")
        elif wid in seen:
            errors.append(f"{prefix}: id duplicado '{wid}'")
        else:
            seen.add(wid)
        if watch.get("scopeKind") not in ("glob", "file", "dir"):
            errors.append(f"{prefix}: scopeKind inválido")
        if watch.get("format") not in ("okf-log", "markdown"):
            errors.append(f"{prefix}: format inválido")
        if not isinstance(watch.get("enabled"), bool):
            errors.append(f"{prefix}: enabled deve ser boolean")
    return errors


def match_files(watches_path: Path, files: list[str]) -> list[dict]:
    data = load_watches(watches_path)
    results: list[dict] = []
    for watch in data.get("watches", []):
        if not watch.get("enabled", True):
            continue
        scope = watch.get("scope", "")
        kind = watch.get("scopeKind", "glob")
        matched = [f for f in files if path_matches(f, scope, kind)]
        if matched:
            entry = dict(watch)
            entry["matchedFiles"] = sorted(set(normalize_path(f) for f in matched))
            results.append(entry)
    return results


def extract_paths_from_json(obj: object, out: set[str]) -> None:
    if isinstance(obj, dict):
        for key, val in obj.items():
            if key in (
                "file_path",
                "path",
                "filePath",
                "edited_file",
                "editedFile",
            ) and isinstance(val, str):
                out.add(val)
            extract_paths_from_json(val, out)
    elif isinstance(obj, list):
        for item in obj:
            extract_paths_from_json(item, out)
    elif isinstance(obj, str):
        if "/" in obj or "\\" in obj:
            if re.match(r"^[\w./\\-]+\.(md|ts|tsx|js|jsx|py|php|json|yaml|yml|sh|ps1)$", obj):
                out.add(obj)


def git_changed_files(cwd: Path) -> list[str]:
    try:
        proc = subprocess.run(
            ["git", "diff", "--name-only", "HEAD"],
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            proc = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=cwd,
                capture_output=True,
                text=True,
                check=False,
            )
            if proc.returncode != 0:
                return []
            lines = []
            for line in proc.stdout.splitlines():
                if len(line) >= 4:
                    lines.append(line[3:].strip())
            return lines
        return [ln.strip() for ln in proc.stdout.splitlines() if ln.strip()]
    except OSError:
        return []


def collect_edited_files(hook_input: dict | None, project_root: Path) -> list[str]:
    paths: set[str] = set()
    if hook_input:
        extract_paths_from_json(hook_input, paths)
    for p in git_changed_files(project_root):
        paths.add(p)
    env_files = __import__("os").environ.get("HOSTDIME_HISTORICO_EDITED_FILES", "")
    for part in env_files.split(":"):
        part = part.strip()
        if part:
            paths.add(part)
    return sorted(normalize_path(p) for p in paths if p)


def build_followup(matches: list[dict]) -> str:
    lines = [
        "History watch: arquivos do escopo foram alterados neste turno.",
        "Append no histórico **antes** de encerrar:",
    ]
    for m in matches:
        refs = ", ".join(f"`{f}`" for f in m.get("matchedFiles", [])[:8])
        fmt = m.get("format", "markdown")
        lines.append(
            f"- Watch `{m['id']}` → [`{m['historyFile']}`]({m['historyFile']}) "
            f"(format: {fmt}). Refs: {refs}"
        )
    lines.append(
        "Campos: timestamp, o quê, refs, por quê. Ler skill `history-watch`."
    )
    return "\n".join(lines)


def cmd_validate(watches_path: Path) -> int:
    try:
        data = load_watches(watches_path)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 1
    errors = validate_watches(data)
    if errors:
        for err in errors:
            print(err, file=sys.stderr)
        return 1
    print("ok")
    return 0


def cmd_status(watches_path: Path) -> int:
    try:
        data = load_watches(watches_path)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 1
    watches = data.get("watches", [])
    if not watches:
        print("Nenhum watch configurado.")
        return 0
    for w in watches:
        state = "enabled" if w.get("enabled") else "disabled"
        print(
            f"{w['id']}: scope={w['scope']} ({w['scopeKind']}) "
            f"history={w['historyFile']} format={w['format']} [{state}]"
        )
    return 0


def cmd_scope_match(watches_path: Path, file_path: str) -> int:
    matches = match_files(watches_path, [file_path])
    if matches:
        print(json.dumps(matches, indent=2, ensure_ascii=False))
        return 0
    print("no match")
    return 1


def cmd_stop(project_root: Path, watches_path: Path, hook_input: dict | None) -> int:
    if not watches_path.is_file():
        return 0
    files = collect_edited_files(hook_input, project_root)
    if not files:
        return 0
    matches = match_files(watches_path, files)
    if not matches:
        return 0
    payload = {"followup_message": build_followup(matches)}
    print(json.dumps(payload, ensure_ascii=False))
    return 0


def main() -> int:
    if len(sys.argv) < 2:
        print(
            "Uso: history-watch-match.py <validate|status|scope-match|stop> ...",
            file=sys.stderr,
        )
        return 1

    cmd = sys.argv[1]
    project_root = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 and cmd != "stop" else Path.cwd()
    watches_path = project_root / ".cursor" / "history" / "watches.json"

    if cmd == "validate":
        return cmd_validate(watches_path)
    if cmd == "status":
        return cmd_status(watches_path)
    if cmd == "scope-match":
        if len(sys.argv) < 4:
            print("Uso: scope-match <projeto> <arquivo>", file=sys.stderr)
            return 1
        return cmd_scope_match(watches_path, sys.argv[3])
    if cmd == "stop":
        hook_input = None
        if not sys.stdin.isatty():
            raw = sys.stdin.read()
            if raw.strip():
                try:
                    hook_input = json.loads(raw)
                except json.JSONDecodeError:
                    hook_input = None
        root = Path.cwd()
        wp = root / ".cursor" / "history" / "watches.json"
        return cmd_stop(root, wp, hook_input)

    print(f"Comando desconhecido: {cmd}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
