"""Funções puras do /avaliar em PR: veredito, prioridade do resumo, markers, snippets.

Usado por review-github-pr.sh (via CLI review-pr-report.py) e unit tests.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from lib.finding_ids import stable_finding_id

VERDICT_OK = "OK"
VERDICT_NOT_RECOMMENDED = "Não recomendado"
VERDICT_NEEDS_CHANGES = "Ajustes necessários"

_RE_VERDICT_OK = re.compile(r"^\*\*Veredito:\*\*\s*OK\s*$", re.MULTILINE)
_RE_VERDICT_BAD = re.compile(
    r"^\*\*Veredito:\*\*\s*N[aã]o recomendado", re.MULTILINE | re.IGNORECASE
)
_RE_VERDICT_AJUSTES = re.compile(
    r"^\*\*Veredito:\*\*\s*Ajustes necessários", re.MULTILINE | re.IGNORECASE
)
_RE_IMPEDITIVO = re.compile(r"^### Impeditivo", re.MULTILINE)
_RE_BLOCK_HEADING = re.compile(r"^####\s+(.+)$", re.MULTILINE)
_RE_PT_SUMMARY = re.compile(
    r"^\*\*Em português:\*\*\s*$([\s\S]*?)(?=^\*\*|\Z)",
    re.MULTILINE,
)
_RE_PT_LINE = re.compile(r"^>\s?(.*)$", re.MULTILINE)


@dataclass(frozen=True)
class SummaryRow:
    action: str
    file: str
    verdict: str
    inline_count: int
    blocking: int


def parse_verdict(report: str) -> str:
    if _RE_VERDICT_OK.search(report):
        return VERDICT_OK
    if _RE_VERDICT_BAD.search(report):
        return VERDICT_NOT_RECOMMENDED
    if _RE_VERDICT_AJUSTES.search(report):
        return VERDICT_NEEDS_CHANGES
    return VERDICT_NEEDS_CHANGES


def verdict_is_failure(verdict: str) -> bool:
    return verdict != VERDICT_OK


def report_has_impeditivo(report: str) -> bool:
    if _RE_IMPEDITIVO.search(report):
        return True
    return parse_verdict(report) == VERDICT_NOT_RECOMMENDED


def extract_block_title(block: str) -> str:
    match = _RE_BLOCK_HEADING.search(block)
    if not match:
        return ""
    return match.group(1).strip()


def extract_pt_summary(block: str) -> str:
    """Primeira linha do blockquote após **Em português:**."""
    found = False
    for line in block.splitlines():
        if line.strip().startswith("**Em português:**"):
            found = True
            continue
        if not found:
            continue
        m = re.match(r"^>\s?(.*)$", line)
        if m:
            return m.group(1).strip()
        if line.strip().startswith("**") or line.startswith("####"):
            break
    return ""


def build_inline_marker(file_path: str, start_line: int | str, title: str) -> str:
    fid = stable_finding_id(title)
    return f"<!-- avaliar-inline:{file_path}:{start_line}:fid:{fid} -->"


def normalize_code_snippet(code: str) -> str:
    lines = []
    for ln in code.replace("\r\n", "\n").split("\n"):
        stripped = ln.strip()
        if stripped:
            lines.append(stripped)
    return "\n".join(lines)


def code_snippets_match(expected: str, actual: str) -> bool:
    return normalize_code_snippet(expected) == normalize_code_snippet(actual)


def inline_block_score(block: str) -> int:
    """Score de prioridade entre achados na mesma linha (De/Para acionável)."""
    score = 0
    if "**De:**" in block:
        score += 3
    if "**Para:**" in block:
        score += 2
    return score


def file_row_priority(
    action: str,
    verdict: str,
    inline_count: int,
    blocking: int,
) -> tuple[int, str]:
    """
    Prioridade do resumo PR (menor = mais alto no sort):
      1 = impeditivo, 2 = inline/achado, 3 = OK, 4 = skip
    Retorna (priority, status_icon).
    """
    if action == "skip":
        return 4, "⏭ pulado (já revisado neste head)"

    if blocking > 0:
        return 1, "🛑 impeditivo"
    if inline_count > 0:
        return 2, f"💬 {inline_count} comentário(s) inline"
    if verdict_is_failure(verdict):
        return 2, "⚠️ achado (sem inline acionável)"
    return 3, "✅ revisado"


def parse_files_log_line(line: str) -> SummaryRow | None:
    parts = line.rstrip("\n").split("\t")
    if len(parts) < 2:
        return None
    action = parts[0]
    file_path = parts[1]
    if not file_path:
        return None
    verdict = parts[2] if len(parts) > 2 else "—"
    try:
        inline_count = int(parts[3]) if len(parts) > 3 else 0
    except ValueError:
        inline_count = 0
    try:
        blocking = int(parts[4]) if len(parts) > 4 else 0
    except ValueError:
        blocking = 0
    return SummaryRow(action, file_path, verdict, inline_count, blocking)


def format_summary_table(log_text: str) -> tuple[str, dict[str, int]]:
    """
    Lê TSV do SUMMARY_FILES_LOG e devolve markdown da tabela ordenada + contadores.

    Contadores: reviewed, skipped, failed, inline_this_run, blocking_this_run
    """
    rows: list[tuple[int, str, str]] = []
    stats = {
        "reviewed": 0,
        "skipped": 0,
        "failed": 0,
        "inline_this_run": 0,
        "blocking_this_run": 0,
    }

    for line in log_text.splitlines():
        row = parse_files_log_line(line)
        if row is None:
            continue
        if row.action == "review":
            stats["reviewed"] += 1
            stats["inline_this_run"] += row.inline_count
            stats["blocking_this_run"] += row.blocking
            if verdict_is_failure(row.verdict):
                stats["failed"] += 1
            priority, icon = file_row_priority(
                row.action, row.verdict, row.inline_count, row.blocking
            )
            md = f"| `{row.file}` | {icon} | {row.verdict or '—'} |"
            rows.append((priority, row.file, md))
        elif row.action == "skip":
            stats["skipped"] += 1
            priority, icon = file_row_priority(row.action, "—", 0, 0)
            md = f"| `{row.file}` | {icon} | — |"
            rows.append((priority, row.file, md))

    rows.sort(key=lambda r: (r[0], r[1]))
    table = "\n".join(r[2] for r in rows)
    if table:
        table += "\n"
    return table, stats


def build_inline_comment_body(block: str) -> str:
    title = extract_block_title(block)
    if not title:
        return ""
    summary = extract_pt_summary(block)
    if summary:
        return f"{title}\n\n{summary}"
    return title
