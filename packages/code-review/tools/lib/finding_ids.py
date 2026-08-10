"""IDs estáveis de achados de review (tema, não path/linha)."""
from __future__ import annotations

import re

FINDING_THEME = re.compile(r"^[^:\n]+:\d+(?:-\d+)?\s*[—\-]\s*(.+)$")


def slugify(text: str) -> str:
    base = re.sub(r"[^\w\s-]", "", text.lower())
    base = re.sub(r"[-\s]+", "-", base).strip("-")
    return base[:80] or "finding"


def extract_finding_theme(text: str) -> str:
    """Remove prefixo arquivo:linha — do título do achado."""
    stripped = text.strip()
    if not stripped:
        return "finding"
    match = FINDING_THEME.match(stripped)
    if match:
        return match.group(1).strip()
    return stripped


def stable_finding_id(text: str) -> str:
    """ID estável entre PRs — só a descrição do achado, não path/linha."""
    return slugify(extract_finding_theme(text))
