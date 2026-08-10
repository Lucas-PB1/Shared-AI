"""Lógica pura da memória de review (escopos, convencoes, merge de decisões)."""
from __future__ import annotations

import fnmatch
import re
from pathlib import Path
from typing import Any

DECISIONS_INGEST_FILE = "decisions-ingest.jsonl"
CONVENCOES_SCOPE = re.compile(r"^##\s+Escopo:\s+(.+)$")

SCOPE_MAP = {
    "simulator-core": "**/simulator-core/**",
    "HdbrDedicatedSimulator": "**/HdbrDedicatedSimulator/**",
    "QuoteModal": "**/HdbrDedicatedSimulator/**/QuoteModal*",
}


def decision_store_label(decision: dict[str, Any]) -> str:
    source = str(decision.get("source", ""))
    if source.startswith("github-pr-"):
        return DECISIONS_INGEST_FILE
    return "decisions.jsonl"


def infer_scope_from_file(file_path: str) -> str:
    if not file_path:
        return "**/*"
    path = file_path.replace("\\", "/")
    for key, pattern in SCOPE_MAP.items():
        if key in path:
            return pattern
    parent = str(Path(path).parent)
    if parent and parent != ".":
        return f"{parent}/**"
    return "**/*"


def infer_scope_from_section(title: str) -> str:
    title_lower = title.lower()
    for key, pattern in SCOPE_MAP.items():
        if key.lower() in title_lower:
            return pattern
    return "**/*"


def glob_matches_file(glob_pattern: str, file_path: str) -> bool:
    normalized = file_path.replace("\\", "/")
    pattern = glob_pattern.strip()
    if not pattern:
        return False
    if pattern in ("**/*", "*"):
        return True
    if pattern.endswith("/**"):
        prefix = pattern[:-3]
        return normalized.startswith(prefix.rstrip("/") + "/") or normalized == prefix.rstrip(
            "/"
        )
    return fnmatch.fnmatch(normalized, pattern)


def extract_scope_glob(scope_label: str) -> str:
    label = scope_label.strip()
    paren = re.search(r"\(\*\*/[^)]+\)", label)
    if paren:
        return paren.group(0)[1:-1]
    if label.startswith("**/"):
        return label
    return label


def parse_convencoes_sections(content: str) -> tuple[str, list[dict[str, Any]]]:
    """Retorna preâmbulo e seções ## Escopo: com bullets."""
    preamble_lines: list[str] = []
    sections: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for line in content.splitlines():
        scope_match = CONVENCOES_SCOPE.match(line.strip())
        if scope_match:
            if current is not None:
                sections.append(current)
            label = scope_match.group(1).strip()
            current = {
                "header": line.rstrip(),
                "label": label,
                "glob": extract_scope_glob(label),
                "bullets": [],
            }
            continue
        if current is None:
            preamble_lines.append(line)
            continue
        stripped = line.strip()
        if stripped.startswith("- "):
            current["bullets"].append(stripped[2:].strip())

    if current is not None:
        sections.append(current)

    return "\n".join(preamble_lines).rstrip(), sections


def render_convencoes_sections(preamble: str, sections: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    if preamble.strip():
        lines.append(preamble.rstrip())
        lines.append("")
    for section in sections:
        lines.append(section["header"])
        lines.append("")
        if section["bullets"]:
            for bullet in section["bullets"]:
                lines.append(f"- {bullet}")
        else:
            lines.append("_(vazio)_")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def find_convencoes_section_index(sections: list[dict[str, Any]], scope: str) -> int | None:
    scope_norm = scope.replace("\\", "/")

    def scope_tokens(value: str) -> set[str]:
        return {token for token in re.findall(r"[\w-]+", value) if len(token) > 3}

    scope_set = scope_tokens(scope_norm)
    best_idx: int | None = None
    best_score = 0

    for idx, section in enumerate(sections):
        section_glob = section.get("glob") or extract_scope_glob(section.get("label", ""))
        if scope_norm == section_glob:
            return idx
        section_set = scope_tokens(section_glob) | scope_tokens(section.get("label", ""))
        overlap = len(scope_set & section_set)
        if overlap > best_score:
            best_score = overlap
            best_idx = idx

    return best_idx if best_score > 0 else None


def merge_promoted_into_convencoes(
    existing: str, new_by_scope: dict[str, list[str]]
) -> tuple[str, int]:
    """Anexa bullets promovidos às seções existentes (dedupe por texto)."""
    preamble, sections = parse_convencoes_sections(existing)
    known = {bullet.strip() for section in sections for bullet in section["bullets"]}
    added = 0

    for scope, rules in new_by_scope.items():
        for rule in rules:
            text = rule.strip()
            if not text or text in known:
                continue
            idx = find_convencoes_section_index(sections, scope)
            if idx is None:
                sections.append(
                    {
                        "header": f"## Escopo: {scope}",
                        "label": scope,
                        "glob": scope,
                        "bullets": [text],
                    }
                )
            else:
                sections[idx]["bullets"].append(text)
            known.add(text)
            added += 1

    return render_convencoes_sections(preamble, sections), added


def merge_history_into_context(
    decisions: list[dict[str, Any]],
    exclusions: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    excl_by_id: dict[str, dict[str, Any]] = {e["id"]: e for e in exclusions}
    cand_by_id: dict[str, dict[str, Any]] = {c["id"]: c for c in candidates}
    pending: list[dict[str, Any]] = []

    for d in decisions:
        fid = d["finding_id"]
        scope = infer_scope_from_file(d.get("file", ""))
        decision = d["decision"]
        source_ref = f"{d.get('file') or d['review_slug']}:{d['line']}"

        if decision in ("rejeitado", "nao-aplicavel"):
            if fid in excl_by_id:
                ex = excl_by_id[fid]
                ex["occurrences"] = ex.get("occurrences", 1) + 1
                ex.setdefault("sources", []).append(source_ref)
            else:
                excl_by_id[fid] = {
                    "id": fid,
                    "scope": scope,
                    "skip_summaries": [d["summary"][:120]],
                    "decision": decision,
                    "reason": d.get("reason") or d["summary"],
                    "since": d["finalized_at"][:10],
                    "occurrences": 1,
                    "sources": [source_ref],
                    "inferred_from": decision_store_label(d),
                }
        elif decision == "adiado":
            pending.append(
                {
                    "id": fid,
                    "scope": scope,
                    "summary": d["summary"],
                    "decision": "adiado",
                    "since": d["finalized_at"][:10],
                    "revisit": "next-touch",
                }
            )
        elif decision == "aceito":
            rule = d["summary"]
            reason = (d.get("reason") or "").strip()
            if reason and not reason.startswith(
                (
                    "suggestion / Para",
                    "código De removido",
                    "indicador `",
                    "thread resolvido",
                    "merge sem resposta",
                )
            ):
                rule = f"{d['summary']} — {reason[:100]}"
            if fid in cand_by_id:
                cand_by_id[fid]["occurrences"] = cand_by_id[fid].get("occurrences", 1) + 1
            else:
                cand_by_id[fid] = {
                    "id": fid,
                    "scope": scope,
                    "rule": rule,
                    "decision": "aceito",
                    "occurrences": 1,
                    "promoted": False,
                    "inferred_from": decision_store_label(d),
                }

    return list(excl_by_id.values()), pending, list(cand_by_id.values())
