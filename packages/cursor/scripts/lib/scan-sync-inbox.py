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


def project_slug(path: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "-", path.strip("/")).strip("-").lower()


def find_transcript_dir(cursor_dir: Path, repo_path: str) -> Path | None:
    projects = cursor_dir / "projects"
    if not projects.is_dir():
        return None
    slug = project_slug(repo_path)
    candidates = sorted(projects.glob(f"*{slug}*"), key=lambda p: p.stat().st_mtime, reverse=True)
    for cand in candidates:
        transcripts = cand / "agent-transcripts"
        if transcripts.is_dir():
            return transcripts
    return None


def latest_user_query(transcript_dir: Path) -> str | None:
    files = sorted(
        transcript_dir.rglob("*.jsonl"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for fp in files[:5]:
        try:
            for line in fp.read_text(encoding="utf-8", errors="replace").splitlines():
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
                    text = part.get("text") or ""
                    text = re.sub(r"<user_query>\s*", "", text)
                    text = re.sub(r"\s*</user_query>", "", text)
                    text = text.strip()
                    if text and len(text) > 10:
                        return text[:280]
        except (OSError, json.JSONDecodeError):
            continue
    return None


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


def infer_objective(git: dict, last_query: str | None) -> str:
    parts: list[str] = []
    if last_query:
        parts.append(f"Chat recente: {last_query}")
    if git.get("lastCommit"):
        parts.append(f"Último commit: {git['lastCommit']}")
    files = git.get("changedFiles") or []
    if files:
        parts.append(f"Arquivos: {', '.join(files[:5])}")
    return " · ".join(parts) if parts else "Alterações locais não commitadas"


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

        results.append(
            {
                "path": str(repo),
                "name": repo.name,
                "branch": git["branch"],
                "changedCount": git["changedCount"],
                "stagedCount": git["stagedCount"],
                "unstagedCount": git["unstagedCount"],
                "changedFiles": git["changedFiles"],
                "lastCommit": git["lastCommit"],
                "lastUserQuery": last_query,
                "objective": infer_objective(git, last_query),
                "scannedAt": datetime.now(timezone.utc).isoformat(),
            }
        )

    results.sort(key=lambda r: r["changedCount"], reverse=True)
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
