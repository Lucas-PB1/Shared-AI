"""Regras puras de ingest de decisões de PR (sem gh / CLI).

Usado por review-ingest-pr-decisions.py e pelos unit tests.
"""
from __future__ import annotations

import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from lib.finding_ids import extract_finding_theme, stable_finding_id

# Carrega helpers de persistência de memória sem circular import pesado
_TOOLS = Path(__file__).resolve().parent.parent


def _load_memoria():
    import importlib.util

    path = _TOOLS / "review-memoria.py"
    spec = importlib.util.spec_from_file_location("review_memoria", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("review-memoria.py não encontrado")
    mod = importlib.util.module_from_spec(spec)
    # tools/ no path para review-memoria importar lib.*
    import sys

    tools = str(_TOOLS)
    if tools not in sys.path:
        sys.path.insert(0, tools)
    spec.loader.exec_module(mod)
    return mod


_mem = _load_memoria()
SCHEMA_VERSION = _mem.SCHEMA_VERSION
read_decisions = _mem.read_decisions
write_decisions = _mem.write_decisions

INLINE_MARKER = re.compile(
    r"<!--\s*avaliar-inline:([^:]+):(\d+)(?::fid:([a-z0-9-]+))?\s*-->"
)
SUGGESTION_BLOCK = re.compile(r"```suggestion\s*\n([\s\S]*?)```", re.MULTILINE)
MD_DE_PARA_BLOCK = re.compile(
    r"\*\*(De|Para):\*\*\s*\n+```(?:\w+)?\s*\n([\s\S]*?)```",
    re.MULTILINE,
)
BACKTICK_CODE = re.compile(r"`([^`]+)`")
BOT_LOGINS = frozenset({"github-actions", "github-actions[bot]", "dependabot[bot]"})

REJECT_PATTERNS = re.compile(
    r"intencional|won'?t fix|wont fix|n[aã]o se aplica|nao se aplica|false positive|"
    r"falso positivo|pode ignorar|ignorar|rejeit|decline|deixa assim|sem necessidade|"
    r"n[aã]o precisa|nao precisa|descart",
    re.IGNORECASE,
)
NAO_APLICAVEL_PATTERNS = re.compile(
    r"s[oó] preview|so preview|s[oó] editor|so editor|edge case|raro no preview|"
    r"n[aã]o afeta produ|nao afeta produ|fora do escopo",
    re.IGNORECASE,
)

ShowFileFn = Callable[[Path, str, str], str]
ListCommitsFn = Callable[[Path, str, str], list[str]]


def parse_repo(repository: str) -> tuple[str, str]:
    owner, _, name = repository.partition("/")
    if not owner or not name:
        raise ValueError(f"Repositório inválido: {repository}")
    return owner, name


def extract_summary(body: str) -> str:
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("<!--"):
            continue
        return stripped[:240]
    return "achado /avaliar"


def normalize_snippet(code: str) -> str:
    lines = [ln.rstrip() for ln in code.replace("\r\n", "\n").split("\n")]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(ln.strip() for ln in lines if ln.strip())


def extract_de_para_from_body(body: str) -> tuple[str, str]:
    de = ""
    para = ""
    for match in MD_DE_PARA_BLOCK.finditer(body):
        label, code = match.group(1), match.group(2)
        if label == "De":
            de = code
        else:
            para = code
    suggestion = SUGGESTION_BLOCK.search(body)
    if suggestion:
        para = para or suggestion.group(1)
    return de, para


def extract_code_indicators(body: str) -> list[str]:
    indicators: list[str] = []
    for match in BACKTICK_CODE.finditer(body):
        token = match.group(1).strip()
        if len(token) < 3:
            continue
        if token not in indicators:
            indicators.append(token)
    return indicators


def snippet_in_file(file_content: str, snippet: str, hint_line: int = 1) -> bool:
    del hint_line  # reservado para heurística futura
    norm = normalize_snippet(snippet)
    if not norm:
        return False
    lines = file_content.splitlines()
    parts = norm.split("\n")
    n = len(parts)
    if n == 0 or not lines:
        return False
    for i in range(len(lines) - n + 1):
        window = "\n".join(lines[i : i + n]).strip()
        if window == norm or all(parts[j] in lines[i + j] for j in range(n)):
            return True
    return norm in file_content


def git_show(project: Path, sha: str, file_path: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(project), "show", f"{sha}:{file_path}"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return ""
    return proc.stdout


def git_rev_parse(project: Path, ref: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(project), "rev-parse", ref],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return ""
    return proc.stdout.strip()


def resolve_pr_commit_range(
    project: Path,
    pr: dict[str, Any],
    merge_oid: str,
) -> tuple[str, str]:
    head_oid = git_rev_parse(project, f"{merge_oid}^2")
    base_oid = git_rev_parse(project, f"{merge_oid}^1")
    if head_oid and base_oid:
        return base_oid, head_oid

    base_oid = (pr.get("baseRefOid") or "").strip()
    head_oid = (pr.get("headRefOid") or "").strip()
    if base_oid and head_oid:
        return base_oid, head_oid

    return base_oid or merge_oid, head_oid or merge_oid


def git_log_commits(project: Path, base_oid: str, head_oid: str) -> list[str]:
    if not base_oid or not head_oid or base_oid == head_oid:
        return [head_oid] if head_oid else []
    proc = subprocess.run(
        ["git", "-C", str(project), "rev-list", "--reverse", f"{base_oid}..{head_oid}"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return []
    return [sha for sha in proc.stdout.splitlines() if sha.strip()]


def snippet_ever_in_commit_range(
    project: Path,
    base_oid: str,
    head_oid: str,
    file_path: str,
    snippet: str,
    hint_line: int = 1,
    *,
    show_file: ShowFileFn = git_show,
    list_commits: ListCommitsFn = git_log_commits,
) -> bool:
    norm = normalize_snippet(snippet)
    if not norm or not file_path:
        return False
    commits = list_commits(project, base_oid, head_oid)
    if not commits and head_oid:
        commits = [head_oid]
    for sha in commits:
        content = show_file(project, sha, file_path)
        if content and snippet_in_file(content, norm, hint_line):
            return True
    return False


def fix_applied_in_pr(
    project: Path,
    *,
    base_oid: str,
    head_oid: str,
    merge_oid: str,
    file_path: str,
    line: int,
    de_code: str,
    para_code: str,
    body: str,
    show_file: ShowFileFn = git_show,
    list_commits: ListCommitsFn = git_log_commits,
) -> tuple[bool, str]:
    file_merge = show_file(project, merge_oid, file_path) if merge_oid else ""
    if not file_merge and head_oid:
        file_merge = show_file(project, head_oid, file_path)

    if para_code and file_merge and snippet_in_file(file_merge, para_code, line):
        return True, "suggestion / Para aplicada no merge"

    if de_code and file_merge:
        if not snippet_in_file(file_merge, de_code, line) and snippet_ever_in_commit_range(
            project,
            base_oid,
            head_oid,
            file_path,
            de_code,
            line,
            show_file=show_file,
            list_commits=list_commits,
        ):
            return True, "código De removido ou corrigido no PR"

    for indicator in extract_code_indicators(body):
        if file_merge and indicator in file_merge:
            continue
        if snippet_ever_in_commit_range(
            project,
            base_oid,
            head_oid,
            file_path,
            indicator,
            line,
            show_file=show_file,
            list_commits=list_commits,
        ):
            return True, f"indicador `{indicator}` removido no PR"

    return False, ""


def classify_thread(
    thread: dict[str, Any],
    merged: bool,
    merge_oid: str,
    base_oid: str,
    head_oid: str,
    project: Path,
    pr_number: int,
    *,
    show_file: ShowFileFn = git_show,
    list_commits: ListCommitsFn = git_log_commits,
    now: str | None = None,
) -> dict[str, Any] | None:
    nodes = thread.get("comments", {}).get("nodes") or []
    if not nodes:
        return None
    root = nodes[0]
    body = root.get("body") or ""
    if "avaliar-inline:" not in body:
        return None

    marker = INLINE_MARKER.search(body)
    file_path = marker.group(1) if marker else (root.get("path") or "")
    line = int(marker.group(2)) if marker else int(root.get("line") or root.get("originalLine") or 1)
    marker_fid = marker.group(3) if marker else None
    raw_summary = extract_summary(body)
    summary = extract_finding_theme(raw_summary)
    de_code, para_code = extract_de_para_from_body(body)

    human = [
        c
        for c in nodes[1:]
        if (c.get("author") or {}).get("login") not in BOT_LOGINS
    ]

    stamp = now or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    base = {
        "schema": SCHEMA_VERSION,
        "finalized_at": stamp,
        "review_slug": f"pr-{pr_number}",
        "file": file_path,
        "finding_id": marker_fid or stable_finding_id(raw_summary),
        "line": line,
        "category": "pr-ingest",
        "summary": summary,
        "source": f"github-pr-{pr_number}",
    }

    human_reason = ""
    for reply in human:
        text = reply.get("body") or ""
        if NAO_APLICAVEL_PATTERNS.search(text):
            return {
                **base,
                "decision": "nao-aplicavel",
                "reason": text.strip()[:200],
            }
        if REJECT_PATTERNS.search(text):
            return {
                **base,
                "decision": "rejeitado",
                "reason": text.strip()[:200],
            }
        if text.strip() and not human_reason:
            human_reason = text.strip()[:200]

    # Qualquer reply humano que não rejeitou → aceito (vazio = sem objeção)
    if human:
        return {
            **base,
            "decision": "aceito",
            "reason": human_reason or "resposta humana no thread (sem objeção)",
        }

    if not merged:
        return None

    applied, applied_reason = fix_applied_in_pr(
        project,
        base_oid=base_oid,
        head_oid=head_oid,
        merge_oid=merge_oid,
        file_path=file_path,
        line=line,
        de_code=de_code,
        para_code=para_code,
        body=body,
        show_file=show_file,
        list_commits=list_commits,
    )
    if applied:
        return {
            **base,
            "decision": "aceito",
            "reason": applied_reason,
        }

    file_content = show_file(project, merge_oid, file_path) if file_path and merge_oid else ""

    if thread.get("isResolved") and file_content and para_code:
        return {
            **base,
            "decision": "aceito",
            "reason": "thread resolvido no PR",
        }

    if thread.get("isResolved") and not human:
        return {
            **base,
            "decision": "aceito",
            "reason": "thread resolvido sem objeção",
        }

    return {
        **base,
        "decision": "rejeitado",
        "reason": "merge sem resposta no thread — achado ignorado",
    }


def upsert_pr_decisions(
    decisions_path: Path,
    pr_number: int,
    new_items: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Substitui decisões do mesmo source github-pr-N (re-ingest idempotente)."""
    source = f"github-pr-{pr_number}"
    existing = [d for d in read_decisions(decisions_path) if d.get("source") != source]
    normalized_new: list[dict[str, Any]] = []
    for item in new_items:
        row = dict(item)
        summary = row.get("summary", "")
        if summary:
            theme = extract_finding_theme(summary)
            row["summary"] = theme
            row["finding_id"] = stable_finding_id(theme)
        normalized_new.append(row)
    existing.extend(normalized_new)
    normalized_all: list[dict[str, Any]] = []
    for item in existing:
        row = dict(item)
        summary = row.get("summary", "")
        if summary:
            theme = extract_finding_theme(summary)
            row["summary"] = theme
            row["finding_id"] = stable_finding_id(theme)
        normalized_all.append(row)
    write_decisions(decisions_path, normalized_all)
    return normalized_new
