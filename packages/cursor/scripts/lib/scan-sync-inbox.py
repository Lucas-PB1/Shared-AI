#!/usr/bin/env python3
"""Scan projetos do registry hostdime por trabalho não commitado + contexto recente."""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

TOOLING_MARKERS = (
    ".gitignore",
    ".cursor/",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
)

CONVENTIONAL_PREFIX = re.compile(
    r"^(feat|fix|chore|refactor|docs|test|style|perf|ci|build)(\([^)]+\))?:\s*",
    re.I,
)


def cursor_project_dir_name(repo_path: str) -> str:
    return str(Path(repo_path).resolve()).replace(os.sep, "-").lstrip("-")


def project_slug(path: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "-", path.strip("/")).strip("-").lower()


def find_transcript_dir(cursor_dir: Path, repo_path: str) -> Path | None:
    projects = cursor_dir / "projects"
    if not projects.is_dir():
        return None

    exact = projects / cursor_project_dir_name(repo_path)
    transcripts = exact / "agent-transcripts"
    if transcripts.is_dir():
        return transcripts

    slug = project_slug(repo_path)
    repo_name = Path(repo_path).name.lower()
    candidates: list[Path] = []
    for entry in projects.iterdir():
        if not entry.is_dir():
            continue
        name = entry.name.lower()
        if slug in name or name.endswith(f"-{repo_name}"):
            cand = entry / "agent-transcripts"
            if cand.is_dir():
                candidates.append(cand)

    if not candidates:
        return None
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return candidates[0]


def load_recent_files(cursor_dir: Path, repo_path: str, limit: int = 5) -> list[str]:
    state_file = cursor_dir / "ide_state.json"
    if not state_file.is_file():
        return []
    try:
        data = json.loads(state_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []

    repo = str(Path(repo_path).resolve())
    prefix = repo + os.sep
    files: list[str] = []
    for entry in data.get("recentlyViewedFiles") or []:
        absolute = entry.get("absolutePath") or ""
        if not absolute.startswith(prefix):
            continue
        rel = absolute[len(prefix) :]
        if rel and rel not in files:
            files.append(rel)
        if len(files) >= limit:
            break
    return files


def is_noise_query(text: str) -> bool:
    lower = text.lower()
    noise_markers = (
        "responda somente em json",
        "analise o contexto de retomada",
        '{"doing":',
        "<user_info>",
        "you are auto, an agent router",
    )
    return any(marker in lower for marker in noise_markers)


def clean_user_query(text: str) -> str:
    text = re.sub(r"<user_query>\s*", "", text)
    text = re.sub(r"\s*</user_query>", "", text)
    text = re.sub(r"<image_files>.*?</image_files>", "", text, flags=re.S)
    text = re.sub(r"\[Image\]\s*", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return ""
    first = re.split(r"(?<=[.!?])\s+|\n+", text, maxsplit=1)[0].strip()
    return first[:120] + ("…" if len(first) > 120 else "")


def latest_user_query(transcript_dir: Path) -> str | None:
    files = sorted(
        transcript_dir.rglob("*.jsonl"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for fp in files[:8]:
        try:
            for line in reversed(fp.read_text(encoding="utf-8", errors="replace").splitlines()):
                if not line.strip():
                    continue
                row = json.loads(line)
                if row.get("role") != "user":
                    continue
                msg = row.get("message") or {}
                parts = msg.get("content") or []
                for part in parts:
                    if part.get("type") != "text":
                        continue
                    text = clean_user_query(part.get("text") or "")
                    if len(text) > 10 and not is_noise_query(text):
                        return text
        except (OSError, json.JSONDecodeError):
            continue
    return None


def shorten_commit(message: str, max_len: int = 72) -> str:
    text = CONVENTIONAL_PREFIX.sub("", message.strip())
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + "…"


def basename_only(path: str) -> str:
    if path.endswith("/"):
        return f"{Path(path.rstrip('/')).name}/"
    return Path(path).name


def infer_areas(changed_files: list[str]) -> list[str]:
    areas: list[str] = []
    for raw in changed_files:
        path = raw.replace("\\", "/")
        module = re.search(r"/modules/([^/]+)/", path)
        if module:
            areas.append(module.group(1))
            continue
        if "/components/" in path:
            part = Path(path).stem
            if part not in ("index", "types"):
                areas.append(part)
            continue
        if "/doc/" in path or path.endswith(".md"):
            areas.append("documentação")
            continue
        if "test" in path.lower():
            areas.append("testes")
            continue
        name = basename_only(path)
        if name not in areas:
            areas.append(name)

    deduped: list[str] = []
    seen: set[str] = set()
    for area in areas:
        key = area.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(area)
    return deduped[:4]


def is_tooling_only(changed_files: list[str]) -> bool:
    if not changed_files:
        return False
    for raw in changed_files:
        path = raw.replace("\\", "/")
        if any(marker in path for marker in TOOLING_MARKERS):
            continue
        if path.startswith(".cursor/"):
            continue
        return False
    return True


def feature_branch_label(branch: str) -> str | None:
    if not branch or branch in {"main", "master", "develop", "dev", "(detached)"}:
        return None
    return branch.replace("-", " ").replace("_", " ")


def build_resume(
    *,
    branch: str,
    changed_count: int,
    changed_files: list[str],
    last_commit: str | None,
    last_query: str | None,
    recent_files: list[str],
) -> tuple[str, str, str]:
    """Retorna (summary, detail, objective legado)."""
    areas = infer_areas(changed_files or recent_files)
    branch_hint = feature_branch_label(branch)
    n = changed_count

    if last_query:
        summary = f"Pedido: {last_query}"
    elif is_tooling_only(changed_files):
        summary = "Setup Cursor / sync do projeto"
    elif areas and areas[0] not in {"documentação", "testes", ".gitignore", "gitignore"}:
        lead = areas[0]
        if branch_hint and branch_hint.lower() not in lead.lower():
            summary = f"{branch_hint} — {lead}"
        else:
            summary = lead
        if len(areas) > 1:
            summary += f" (+{len(areas) - 1})"
    elif branch_hint:
        summary = f"Branch {branch_hint}"
    elif last_commit:
        summary = shorten_commit(last_commit)
    else:
        summary = f"{n} arquivo(s) em andamento"

    detail_parts: list[str] = []
    if branch:
        detail_parts.append(branch)
    detail_parts.append(f"{n} arquivo{'s' if n != 1 else ''}")
    if areas:
        detail_parts.append(", ".join(areas[:2]))
    elif recent_files:
        detail_parts.append(basename_only(recent_files[0]))
    detail = " · ".join(detail_parts)

    objective_parts: list[str] = []
    if last_query:
        objective_parts.append(f"Último pedido: {last_query}")
    if branch_hint:
        objective_parts.append(f"Branch: {branch}")
    if areas:
        objective_parts.append(f"Áreas: {', '.join(areas[:3])}")
    elif changed_files:
        objective_parts.append(
            "Arquivos: " + ", ".join(basename_only(p) for p in changed_files[:4])
        )
    if last_commit and not last_query:
        objective_parts.append(f"Commit: {shorten_commit(last_commit, 60)}")
    objective = " · ".join(objective_parts) if objective_parts else summary

    return summary, detail, objective


def git_info(repo: Path) -> dict | None:
    if not (repo / ".git").exists():
        return None
    try:
        subprocess.run(
            ["git", "-C", str(repo), "rev-parse", "--git-dir"],
            capture_output=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None

    def run(args: list[str]) -> str:
        proc = subprocess.run(
            ["git", "-C", str(repo), *args],
            capture_output=True,
            text=True,
            check=False,
        )
        return (proc.stdout or "").strip()

    porcelain = run(["status", "--porcelain"])
    if not porcelain:
        return None

    branch = run(["branch", "--show-current"]) or "(detached)"
    last_commit = run(["log", "-1", "--pretty=%s"])
    changed = []
    for line in porcelain.splitlines():
        if len(line) < 4:
            continue
        path = line[3:].strip()
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        changed.append({"code": line[:2], "path": path})

    staged = sum(1 for c in changed if c["code"][0] != " " and c["code"][0] != "?")
    unstaged = sum(1 for c in changed if c["code"][1] != " ")

    return {
        "branch": branch,
        "lastCommit": last_commit,
        "changedCount": len(changed),
        "stagedCount": staged,
        "unstagedCount": unstaged,
        "changedFiles": [c["path"] for c in changed[:12]],
        "porcelain": porcelain,
    }


def scan_projects(registry_path: Path, cursor_dir: Path) -> list[dict]:
    if not registry_path.is_file():
        return []
    data = json.loads(registry_path.read_text(encoding="utf-8"))
    results: list[dict] = []
    seen: set[str] = set()

    for entry in data.get("projects", []):
        path = entry.get("path", "")
        if not path:
            continue
        repo = Path(path).resolve()
        key = str(repo)
        if key in seen or not repo.is_dir():
            continue
        seen.add(key)

        git = git_info(repo)
        if not git:
            continue

        transcripts = find_transcript_dir(cursor_dir, str(repo))
        last_query = latest_user_query(transcripts) if transcripts else None
        recent_files = load_recent_files(cursor_dir, str(repo))
        summary, detail, objective = build_resume(
            branch=git["branch"],
            changed_count=git["changedCount"],
            changed_files=git["changedFiles"],
            last_commit=git["lastCommit"],
            last_query=last_query,
            recent_files=recent_files,
        )

        results.append(
            {
                "path": str(repo),
                "name": repo.name,
                "branch": git["branch"],
                "changedCount": git["changedCount"],
                "stagedCount": git["stagedCount"],
                "unstagedCount": git["unstagedCount"],
                "changedFiles": git["changedFiles"],
                "recentFiles": recent_files,
                "lastCommit": git["lastCommit"],
                "lastUserQuery": last_query,
                "summary": summary,
                "detail": detail,
                "objective": objective,
                "scannedAt": datetime.now(timezone.utc).isoformat(),
            }
        )

    def sort_key(row: dict) -> tuple:
        has_chat = 0 if row.get("lastUserQuery") else 1
        tooling = 0 if is_tooling_only(row.get("changedFiles") or []) else 1
        return (has_chat, tooling, -row["changedCount"])

    results.sort(key=sort_key)
    return results


def main() -> int:
    cursor_dir = Path(os.environ.get("CURSOR_USER_DIR", Path.home() / ".cursor"))
    registry = cursor_dir / "hostdime-ia" / "projects.json"
    out_path = cursor_dir / "hostdime-ia" / "sync-inbox.json"

    if len(sys.argv) > 1 and sys.argv[1] == "--registry":
        registry = Path(sys.argv[2])
    if len(sys.argv) > 1 and sys.argv[1] == "--out":
        out_path = Path(sys.argv[2])

    items = scan_projects(registry, cursor_dir)
    payload = {"version": 1, "generatedAt": datetime.now(timezone.utc).isoformat(), "items": items}
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
