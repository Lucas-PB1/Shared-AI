#!/usr/bin/env python3
"""Match paths against .cursor/history/watches.json scopes."""
from __future__ import annotations

import argparse
import fnmatch
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
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


def git_changed_files(cwd: Path, base: str = "HEAD") -> list[str]:
    paths: set[str] = set()

    def run(args: list[str]) -> None:
        try:
            proc = subprocess.run(
                args,
                cwd=cwd,
                capture_output=True,
                text=True,
                check=False,
            )
            if proc.returncode != 0:
                return
            for line in proc.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                if len(line) >= 4 and line[:2] in ("??", " M", "M ", "A ", " D", "D "):
                    paths.add(line[3:].strip())
                else:
                    paths.add(line)
        except OSError:
            return

    run(["git", "diff", "--name-only", base])
    run(["git", "diff", "--cached", "--name-only", base])
    if base == "HEAD":
        run(["git", "ls-files", "--others", "--exclude-standard"])
    return sorted(normalize_path(p) for p in paths if p)


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
        refs = ", ".join(f"`{f}`" for f in m.get("matchedFiles", m.get("pendingFiles", []))[:8])
        fmt = m.get("format", "markdown")
        lines.append(
            f"- Watch `{m['id']}` → [`{m['historyFile']}`]({m['historyFile']}) "
            f"(format: {fmt}). Refs: {refs}"
        )
    lines.append(
        "Campos: timestamp, o quê, refs, por quê. Ler skill `history-watch`."
    )
    return "\n".join(lines)


def split_history_sections(text: str, max_sections: int = 5) -> list[str]:
    sections: list[str] = []
    current: list[str] = []
    for line in text.splitlines():
        if line.startswith("## ") and current:
            sections.append("\n".join(current))
            if len(sections) >= max_sections:
                break
            current = [line]
        elif line.startswith("## "):
            current = [line]
        elif current:
            current.append(line)
    if current and len(sections) < max_sections:
        sections.append("\n".join(current))
    return sections


def extract_refs_from_history(history_path: Path, fmt: str, max_sections: int = 3) -> set[str]:
    if not history_path.is_file():
        return set()

    text = history_path.read_text(encoding="utf-8")
    refs: set[str] = set()
    sections = split_history_sections(text, max_sections=max_sections)

    for section in sections:
        if fmt == "okf-log":
            for match in re.finditer(r"refs:\s*\[([^\]]+)\]", section, re.IGNORECASE):
                chunk = match.group(1)
                for link in re.finditer(r"\[[^\]]*\]\(([^)]+)\)", chunk):
                    refs.add(normalize_path(link.group(1)))
                for tick in re.finditer(r"`([^`]+)`", chunk):
                    refs.add(normalize_path(tick.group(1)))
            for match in re.finditer(r"refs:\s*`([^`]+)`", section, re.IGNORECASE):
                refs.add(normalize_path(match.group(1)))
        else:
            for line in section.splitlines():
                stripped = line.strip()
                if stripped.lower().startswith("- **refs:**"):
                    for tick in re.finditer(r"`([^`]+)`", line):
                        refs.add(normalize_path(tick.group(1)))

    return refs


def file_mtime(project_root: Path, rel_path: str) -> float:
    path = project_root / rel_path
    try:
        return path.stat().st_mtime
    except OSError:
        return 0.0


def pending_files_for_watch(
    project_root: Path,
    watch: dict,
    changed_files: list[str],
) -> list[str]:
    scope = watch.get("scope", "")
    kind = watch.get("scopeKind", "glob")
    matched = sorted(
        {
            normalize_path(f)
            for f in changed_files
            if path_matches(f, scope, kind)
        }
    )
    if not matched:
        return []

    history_path = project_root / watch.get("historyFile", "")
    recent_refs = extract_refs_from_history(history_path, watch.get("format", "markdown"))
    history_mtime = history_path.stat().st_mtime if history_path.is_file() else 0.0

    pending: list[str] = []
    for rel in matched:
        newer_than_log = file_mtime(project_root, rel) > history_mtime + 1
        missing_ref = rel not in recent_refs
        if newer_than_log or missing_ref:
            pending.append(rel)
    return pending


def collect_pending_watches(
    project_root: Path,
    watches_path: Path,
    base: str = "HEAD",
) -> list[dict]:
    if not watches_path.is_file():
        return []

    data = load_watches(watches_path)
    changed = git_changed_files(project_root, base=base)
    if not changed:
        return []

    pending_watches: list[dict] = []
    for watch in data.get("watches", []):
        if not watch.get("enabled", True):
            continue
        pending = pending_files_for_watch(project_root, watch, changed)
        if not pending:
            continue
        entry = dict(watch)
        entry["pendingFiles"] = pending
        entry["changedInScope"] = sorted(
            {
                normalize_path(f)
                for f in changed
                if path_matches(f, watch.get("scope", ""), watch.get("scopeKind", "glob"))
            }
        )
        pending_watches.append(entry)
    return pending_watches


def build_draft_entry(watch: dict, pending_files: list[str]) -> str:
    now = datetime.now(timezone.utc)
    fmt = watch.get("format", "markdown")
    files = pending_files[:12]

    if fmt == "okf-log":
        date = now.strftime("%Y-%m-%d")
        clock = now.strftime("%H:%M")
        refs = ", ".join(f"[{PurePosixPath(f).name}]({f})" for f in files)
        return (
            f"## {date}\n"
            f"* **Update** ({clock} UTC): <descreva o que mudou> "
            f"— refs: [{refs}] — motivo: <por quê>"
        )

    iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    refs = ", ".join(f"`{f}`" for f in files)
    return (
        f"## {iso}\n\n"
        f"- **O quê:** <descreva o que mudou>\n"
        f"- **Refs:** {refs}\n"
        f"- **Por quê:** <motivo ou decisão>"
    )


def build_catchup_followup(pending_watches: list[dict]) -> str:
    lines = [
        "History watch — catch-up manual: há alterações no escopo ainda não refletidas no log.",
        "Append no histórico (recentes primeiro) para cada watch abaixo:",
    ]
    for watch in pending_watches:
        refs = ", ".join(f"`{f}`" for f in watch.get("pendingFiles", [])[:8])
        lines.append(
            f"- Watch `{watch['id']}` → [`{watch['historyFile']}`]({watch['historyFile']}) "
            f"(format: {watch.get('format', 'markdown')}). Pendente: {refs}"
        )
    lines.append(
        "Use os rascunhos de `npm run historico -- catch-up` ou complete o quê/por quê. "
        "Ler skill `history-watch`."
    )
    return "\n".join(lines)


def cmd_pending(
    project_root: Path,
    watches_path: Path,
    *,
    base: str = "HEAD",
    as_json: bool = False,
    check_only: bool = False,
) -> int:
    pending = collect_pending_watches(project_root, watches_path, base=base)
    if as_json:
        payload = {
            "project": str(project_root),
            "base": base,
            "hasPending": bool(pending),
            "watches": [
                {
                    "id": w["id"],
                    "scope": w["scope"],
                    "historyFile": w["historyFile"],
                    "format": w["format"],
                    "pendingFiles": w["pendingFiles"],
                    "changedInScope": w.get("changedInScope", []),
                }
                for w in pending
            ],
        }
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return 1 if check_only and pending else 0

    if not pending:
        print("Nenhuma pendência de log — escopos limpos ou sem alterações git.")
        return 0

    print(f"Pendências de log ({len(pending)} watch(es), base={base}):\n")
    for watch in pending:
        print(f"• {watch['id']} → {watch['historyFile']} ({watch['format']})")
        for rel in watch["pendingFiles"]:
            print(f"    - {rel}")
        print("")
    return 1 if check_only else 0


def cmd_catch_up(
    project_root: Path,
    watches_path: Path,
    *,
    base: str = "HEAD",
    as_json: bool = False,
) -> int:
    pending = collect_pending_watches(project_root, watches_path, base=base)
    drafts = [
        {
            "watchId": w["id"],
            "historyFile": w["historyFile"],
            "format": w["format"],
            "pendingFiles": w["pendingFiles"],
            "draft": build_draft_entry(w, w["pendingFiles"]),
        }
        for w in pending
    ]

    if as_json:
        payload = {
            "project": str(project_root),
            "base": base,
            "hasPending": bool(pending),
            "followup_message": build_catchup_followup(pending) if pending else "",
            "drafts": drafts,
        }
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return 0

    if not pending:
        print("Nenhuma pendência — log em dia para os escopos observados.")
        return 0

    print("=== Histórico — catch-up manual ===\n")
    print(build_catchup_followup(pending))
    print("\n--- Rascunhos (append no topo do arquivo, após cabeçalho) ---\n")
    for item in drafts:
        print(f"### {item['historyFile']} (watch `{item['watchId']}`)\n")
        print(item["draft"])
        print("")
    return 0


def cmd_draft(
    project_root: Path,
    watches_path: Path,
    watch_id: str,
    *,
    base: str = "HEAD",
    as_json: bool = False,
) -> int:
    pending = collect_pending_watches(project_root, watches_path, base=base)
    watch = next((w for w in pending if w["id"] == watch_id), None)
    if not watch:
        print(f"Nenhuma pendência para watch '{watch_id}'.", file=sys.stderr)
        return 1

    draft = build_draft_entry(watch, watch["pendingFiles"])
    if as_json:
        print(
            json.dumps(
                {
                    "watchId": watch_id,
                    "historyFile": watch["historyFile"],
                    "pendingFiles": watch["pendingFiles"],
                    "draft": draft,
                },
                indent=2,
                ensure_ascii=False,
            )
        )
        return 0

    print(draft)
    return 0


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


def parse_project_command(argv: list[str]) -> tuple[Path, argparse.Namespace, list[str]]:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--base", default="HEAD")
    args, rest = parser.parse_known_args(argv)
    project = Path(rest[0]).resolve() if rest else Path.cwd().resolve()
    return project, args, rest


def main() -> int:
    if len(sys.argv) < 2:
        print(
            "Uso: history-watch-match.py "
            "<validate|status|scope-match|pending|catch-up|draft|stop> ...",
            file=sys.stderr,
        )
        return 1

    cmd = sys.argv[1]

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

    if cmd in ("pending", "catch-up"):
        project, args, _ = parse_project_command(sys.argv[2:])
        watches_path = project / ".cursor" / "history" / "watches.json"
        if cmd == "pending":
            return cmd_pending(
                project,
                watches_path,
                base=args.base,
                as_json=args.json,
                check_only=args.check,
            )
        return cmd_catch_up(
            project,
            watches_path,
            base=args.base,
            as_json=args.json,
        )

    if cmd == "draft":
        if len(sys.argv) < 3:
            print("Uso: draft <watch-id> [--json] [--base=HEAD] [projeto]", file=sys.stderr)
            return 1
        watch_id = sys.argv[2]
        project, args, _ = parse_project_command(sys.argv[3:])
        watches_path = project / ".cursor" / "history" / "watches.json"
        return cmd_draft(
            project,
            watches_path,
            watch_id,
            base=args.base,
            as_json=args.json,
        )

    project_root = (
        Path(sys.argv[2]).resolve()
        if len(sys.argv) > 2 and cmd != "stop"
        else Path.cwd()
    )
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

    print(f"Comando desconhecido: {cmd}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
