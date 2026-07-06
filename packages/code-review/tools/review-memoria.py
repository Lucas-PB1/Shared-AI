#!/usr/bin/env python3
"""CLI de memória de review v2 — migrar, compactar, promover (sem deps externas)."""
from __future__ import annotations

import argparse
import fnmatch
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
HISTORY_LINE = re.compile(
    r"^-\s+\[(aceito|rejeitado|adiado|nao-aplicavel)\]\s+"
    r"L(\d+(?:-\d+)?)\s+—\s+(.+?)(?:\s+—\s+(.+))?$"
)
HISTORY_SECTION = re.compile(r"^###\s+(\d{4}-\d{2}-\d{2})\s+—\s+(.+)$")
CONVENTION_SECTION = re.compile(r"^###\s+(.+)$")

SCOPE_MAP = {
    "simulator-core": "**/simulator-core/**",
    "HdbrDedicatedSimulator": "**/HdbrDedicatedSimulator/**",
    "QuoteModal": "**/HdbrDedicatedSimulator/**/QuoteModal*",
}

EXCLUSION_HINTS = re.compile(
    r"rejeitado|nao-aplicavel|não exigir|nao exigir|não forçar|nao forcar|"
    r"aceito pelo time|comportamento aceito|é intencional|é pra ser|não se aplica",
    re.IGNORECASE,
)


def review_dir(project: Path) -> Path:
    return project / ".cursor" / "review"


def slugify(text: str) -> str:
    base = re.sub(r"[^\w\s-]", "", text.lower())
    base = re.sub(r"[-\s]+", "-", base).strip("-")
    return base[:80] or "finding"


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


def load_slug_index(resultados: Path) -> dict[str, str]:
    index: dict[str, str] = {}
    if not resultados.is_dir():
        return index
    for meta in resultados.glob("*/meta.txt"):
        slug = None
        arquivo = None
        for line in meta.read_text(encoding="utf-8").splitlines():
            if line.startswith("slug:"):
                slug = line.split(":", 1)[1].strip()
            elif line.startswith("arquivo:"):
                arquivo = line.split(":", 1)[1].strip()
                if arquivo.startswith(".cursor/review/inbox/"):
                    arquivo = arquivo.removeprefix(".cursor/review/inbox/")
        if slug and arquivo:
            index[slug] = arquivo
    return index


def parse_memoria(path: Path) -> tuple[list[dict[str, str]], list[dict[str, Any]], list[dict[str, Any]]]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    convention_sections: list[tuple[str, list[str]]] = []
    history_entries: list[dict[str, Any]] = []

    section = "preamble"
    current_conv_title = ""
    current_conv_bullets: list[str] = []
    current_date = ""
    current_slug = ""

    for raw in lines:
        line = raw.strip()
        if line == "## Convenções validadas pelo time":
            section = "conventions"
            continue
        if line == "## Histórico":
            if current_conv_title and current_conv_bullets:
                convention_sections.append((current_conv_title, current_conv_bullets))
            section = "history"
            current_conv_title = ""
            current_conv_bullets = []
            continue

        if section == "conventions":
            m = CONVENTION_SECTION.match(line)
            if m:
                if current_conv_title and current_conv_bullets:
                    convention_sections.append((current_conv_title, current_conv_bullets))
                current_conv_title = m.group(1).strip()
                current_conv_bullets = []
                continue
            if line.startswith("- "):
                current_conv_bullets.append(line[2:].strip())

        if section == "history":
            m = HISTORY_SECTION.match(line)
            if m:
                current_date = m.group(1)
                current_slug = m.group(2).strip()
                continue
            m = HISTORY_LINE.match(line)
            if m and current_slug:
                history_entries.append(
                    {
                        "date": current_date,
                        "review_slug": current_slug,
                        "decision": m.group(1),
                        "line": m.group(2),
                        "summary": m.group(3).strip(),
                        "reason": (m.group(4) or "").strip() or None,
                    }
                )

    if current_conv_title and current_conv_bullets:
        convention_sections.append((current_conv_title, current_conv_bullets))

    convention_bullets: list[dict[str, str]] = []
    for title, bullets in convention_sections:
        scope = infer_scope_from_section(title)
        for bullet in bullets:
            convention_bullets.append({"section": title, "scope": scope, "text": bullet})

    return convention_bullets, history_entries, convention_sections


def conventions_to_rules(
    convention_bullets: list[dict[str, str]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """Retorna exclusions, convention_rules (positivas), candidates vazios."""
    exclusions: list[dict[str, Any]] = []
    convention_rules: list[dict[str, Any]] = []

    for item in convention_bullets:
        text = item["text"]
        scope = item["scope"]
        fid = slugify(text[:60])
        entry = {
            "id": fid,
            "scope": scope,
            "summary": text,
            "section": item["section"],
        }
        if EXCLUSION_HINTS.search(text):
            exclusions.append(
                {
                    **entry,
                    "decision": "nao-aplicavel" if "nao-aplicavel" in text.lower() else "rejeitado",
                    "reason": text[:160],
                    "skip_summaries": [text[:80]],
                    "inferred_from": "memoria-conventions",
                }
            )
        else:
            convention_rules.append({**entry, "rule": text})

    return exclusions, convention_rules, []


def history_to_decisions(
    history: list[dict[str, Any]], slug_index: dict[str, str]
) -> list[dict[str, Any]]:
    decisions: list[dict[str, Any]] = []
    for item in history:
        slug = item["review_slug"]
        file_path = slug_index.get(slug, "")
        summary = item["summary"]
        decisions.append(
            {
                "schema": SCHEMA_VERSION,
                "finalized_at": f"{item['date']}T12:00:00Z",
                "review_slug": slug,
                "file": file_path,
                "finding_id": slugify(summary),
                "line": item["line"],
                "category": "review-history",
                "summary": summary,
                "decision": item["decision"],
                "reason": item.get("reason"),
                "source": "memoria-migrar",
            }
        )
    return decisions


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
                    "inferred_from": "decisions.jsonl",
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
            if fid in cand_by_id:
                cand_by_id[fid]["occurrences"] = cand_by_id[fid].get("occurrences", 1) + 1
            else:
                cand_by_id[fid] = {
                    "id": fid,
                    "scope": scope,
                    "rule": d["summary"],
                    "decision": "aceito",
                    "occurrences": 1,
                    "promoted": False,
                    "inferred_from": "decisions.jsonl",
                }

    return list(excl_by_id.values()), pending, list(cand_by_id.values())


def dump_yaml(data: dict[str, Any]) -> str:
    """YAML mínimo para o schema de context — sem PyYAML."""

    def esc(s: str) -> str:
        if any(c in s for c in ":{}[]&*#?|-<>=!%@`"):
            return json.dumps(s, ensure_ascii=False)
        return s

    lines = [
        f"schema: {data.get('schema', SCHEMA_VERSION)}",
        f"updated_at: {esc(data.get('updated_at', ''))}",
        f"source: {esc(data.get('source', ''))}",
        "",
        "exclusions:",
    ]
    for ex in data.get("exclusions", []):
        lines.append(f"  - id: {esc(ex['id'])}")
        lines.append(f"    scope: {esc(ex['scope'])}")
        if ex.get("skip_categories"):
            lines.append(f"    skip_categories: {json.dumps(ex['skip_categories'])}")
        if ex.get("skip_summaries") and ex["skip_summaries"] != [ex.get("reason", "")[:80]]:
            lines.append("    skip_summaries:")
            for s in ex["skip_summaries"][:2]:
                lines.append(f"      - {esc(s[:80])}")
        lines.append(f"    decision: {ex.get('decision', 'rejeitado')}")
        if ex.get("reason"):
            lines.append(f"    reason: {esc(ex['reason'][:120])}")
        if ex.get("since"):
            lines.append(f"    since: {esc(ex['since'])}")
        lines.append(f"    occurrences: {ex.get('occurrences', 1)}")
        if ex.get("inferred_from"):
            lines.append(f"    inferred_from: {esc(ex['inferred_from'])}")

    lines.append("")
    lines.append("pending:")
    if not data.get("pending"):
        lines.append("  []")
    else:
        for p in data["pending"]:
            lines.append(f"  - id: {esc(p['id'])}")
            lines.append(f"    scope: {esc(p['scope'])}")
            lines.append(f"    summary: {esc(p['summary'])}")
            lines.append(f"    decision: {p.get('decision', 'adiado')}")
            lines.append(f"    since: {esc(p.get('since', ''))}")
            lines.append(f"    revisit: {esc(p.get('revisit', 'next-touch'))}")

    return "\n".join(lines) + "\n"


def build_context(
    project: Path,
    source: str,
    decisions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    memoria = review_dir(project) / "memoria.md"
    convention_bullets, history, _ = parse_memoria(memoria)
    slug_index = load_slug_index(review_dir(project) / "resultados")

    if decisions is None:
        decisions = history_to_decisions(history, slug_index)

    excl_conv, conv_rules, _ = conventions_to_rules(convention_bullets)
    exclusions, pending, candidates = merge_history_into_context(decisions, excl_conv, [])

    return {
        "schema": SCHEMA_VERSION,
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": source,
        "exclusions": exclusions,
        "pending": pending,
        "convention_rules": conv_rules,
        "candidates": candidates,
    }


def write_decisions(path: Path, decisions: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for d in decisions:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")


def read_decisions(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    out: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        out.append(json.loads(line))
    return out


def mode(project: Path) -> str:
    version_file = review_dir(project) / ".memoria-version"
    if version_file.is_file() and version_file.read_text(encoding="utf-8").strip() == "2":
        return "v2"
    return "v1"


def file_stats(project: Path) -> dict[str, Any]:
    rd = review_dir(project)
    files = {
        "memoria.md": rd / "memoria.md",
        "memoria.legacy.md": rd / "memoria.legacy.md",
        "decisions.jsonl": rd / "decisions.jsonl",
        "context.yaml": rd / "context.yaml",
        "convencoes.md": rd / "convencoes.md",
        ".memoria-version": rd / ".memoria-version",
    }
    stats: dict[str, Any] = {}
    for name, path in files.items():
        if path.is_file():
            stats[name] = {"bytes": path.stat().st_size, "lines": len(path.read_text(encoding="utf-8").splitlines())}
        else:
            stats[name] = None
    return stats


def cmd_status(project: Path) -> int:
    rd = review_dir(project)
    m = mode(project)
    stats = file_stats(project)
    print(f"Modo: {m}")
    print(f"Projeto: {project}")
    print("")
    print("Arquivos:")
    for name, info in stats.items():
        if info:
            print(f"  {name:22} {info['bytes']:6} bytes  {info['lines']:4} linhas")
        else:
            print(f"  {name:22} —")
    if m == "v1" and stats.get("memoria.md"):
        _, history, _ = parse_memoria(rd / "memoria.md")
        print("")
        print(f"Pendente: migrar ({len(history)} decisões no Histórico)")
    if m == "v2":
        dec = read_decisions(rd / "decisions.jsonl")
        ctx = rd / "context.yaml"
        print("")
        print(f"decisions.jsonl: {len(dec)} entradas")
        print(f"context.yaml: {'sim' if ctx.is_file() else 'não — rode compactar'}")
    backup = rd / "backups" / "memoria-original.md"
    if backup.is_file():
        print(f"\nBackup: {backup} ({backup.stat().st_size} bytes)")
    return 0


def cmd_backup(project: Path) -> int:
    rd = review_dir(project)
    src = rd / "memoria.md"
    if not src.is_file():
        print("Erro: memoria.md não encontrado", file=sys.stderr)
        return 1
    dest_dir = rd / "backups"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / "memoria-original.md"
    shutil.copy2(src, dest)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    stamped = dest_dir / f"memoria-{ts}.md"
    shutil.copy2(src, stamped)
    print(f"Backup: {dest}")
    print(f"Cópia:  {stamped}")
    return 0


def cmd_migrar(project: Path, write: bool) -> int:
    rd = review_dir(project)
    memoria = rd / "memoria.md"
    if not memoria.is_file():
        print("Erro: memoria.md não encontrado", file=sys.stderr)
        return 1

    convention_bullets, history, _ = parse_memoria(memoria)
    slug_index = load_slug_index(rd / "resultados")
    decisions = history_to_decisions(history, slug_index)
    context = build_context(project, "memoria.md", decisions)

    print("=== migrar (proposta) ===")
    print(f"Convenções: {len(convention_bullets)} bullets")
    print(f"Histórico:  {len(history)} decisões → decisions.jsonl")
    print(f"Exclusions: {len(context['exclusions'])}")
    print(f"Pending:    {len(context['pending'])}")
    print(f"Conv.rules: {len(context.get('convention_rules', []))}")
    print(f"Candidates: {len(context['candidates'])}")
    print(f"memoria.md: {memoria.stat().st_size} bytes")
    print(f"context:    ~{len(dump_yaml(context))} bytes (estimado)")

    if not write:
        print("\nDry-run. Use --write para gravar.")
        return 0

    legacy = rd / "memoria.legacy.md"
    if not legacy.is_file():
        shutil.copy2(memoria, legacy)

    write_decisions(rd / "decisions.jsonl", decisions)
    (rd / "context.yaml").write_text(dump_yaml(context), encoding="utf-8")
    (rd / ".memoria-version").write_text("2\n", encoding="utf-8")
    print("\nGravado: decisions.jsonl, context.yaml, .memoria-version")
    print(f"Preservado: memoria.md + memoria.legacy.md")
    return 0


def cmd_compactar(project: Path, write: bool) -> int:
    rd = review_dir(project)
    decisions = read_decisions(rd / "decisions.jsonl")
    if not decisions and (rd / "memoria.md").is_file():
        _, history, _ = parse_memoria(rd / "memoria.md")
        slug_index = load_slug_index(rd / "resultados")
        decisions = history_to_decisions(history, slug_index)

    if not decisions:
        print("Erro: nenhuma decisão em decisions.jsonl", file=sys.stderr)
        return 1

    source = "decisions.jsonl" if (rd / "decisions.jsonl").is_file() else "memoria.md"
    context = build_context(project, source, decisions)

    print("=== compactar (proposta) ===")
    print(f"Exclusions: {len(context['exclusions'])}")
    print(f"Pending:    {len(context['pending'])}")
    print(f"Conv.rules: {len(context.get('convention_rules', []))}")
    print(f"Candidates: {len(context['candidates'])}")

    if not write:
        print("\nDry-run. Use --write para gravar context.yaml.")
        return 0

    (rd / "context.yaml").write_text(dump_yaml(context), encoding="utf-8")
    print(f"\nGravado: {rd / 'context.yaml'}")
    return 0


def cmd_promover(project: Path, write: bool, all_candidates: bool) -> int:
    memoria = review_dir(project) / "memoria.md"
    if not memoria.is_file():
        print("Erro: memoria.md necessário para convenções", file=sys.stderr)
        return 1

    context = build_context(project, "promover")
    convention_bullets, _, _ = parse_memoria(memoria)
    _, conv_rules, _ = conventions_to_rules(convention_bullets)
    sections: dict[str, list[str]] = {}

    for r in conv_rules:
        sections.setdefault(r["scope"], []).append(r["rule"])

    for c in context["candidates"]:
        if not all_candidates and c.get("occurrences", 1) < 2:
            continue
        if c.get("promoted"):
            continue
        sections.setdefault(c["scope"], []).append(c["rule"])

    if not sections:
        print("Nenhuma regra para promover.")
        return 0

    lines = [
        "# Convenções locais (gitignored)",
        "",
        f"Atualizado: {datetime.now().strftime('%Y-%m-%d')} via review-memoria promover",
        "Origem: context.yaml → candidates",
        "",
    ]
    for scope, rules in sections.items():
        lines.append(f"## Escopo: {scope}")
        lines.append("")
        for rule in rules[:15]:
            lines.append(f"- {rule}")
        lines.append("")

    content = "\n".join(lines)

    print("=== promover (proposta) ===")
    print(f"Escopos: {len(sections)}")
    print(f"Bullets: {sum(len(v) for v in sections.values())}")
    print(f"Tamanho: {len(content)} bytes")

    if not write:
        print("\nDry-run. Use --write para gravar convencoes.md.")
        return 0

    out = review_dir(project) / "convencoes.md"
    out.write_text(content, encoding="utf-8")
    print(f"\nGravado: {out}")
    return 0


def cmd_restore(project: Path, write: bool) -> int:
    rd = review_dir(project)
    backup = rd / "backups" / "memoria-original.md"
    if not backup.is_file():
        print("Erro: backup não encontrado — rode backup primeiro", file=sys.stderr)
        return 1

    print("=== restore (proposta) ===")
    print(f"Restaurar memoria.md a partir de {backup}")
    print("Remover: .memoria-version, decisions.jsonl, context.yaml, convencoes.md, memoria.legacy.md")

    if not write:
        print("\nDry-run. Use --write para restaurar estado v1.")
        return 0

    shutil.copy2(backup, rd / "memoria.md")
    for name in (
        ".memoria-version",
        "decisions.jsonl",
        "context.yaml",
        "convencoes.md",
        "memoria.legacy.md",
    ):
        p = rd / name
        if p.is_file():
            p.unlink()
    print("\nRestaurado para v1 (memoria.md do backup).")
    return 0


def cmd_diff(project: Path) -> int:
    rd = review_dir(project)
    memoria = rd / "memoria.md"
    if not memoria.is_file():
        print("Erro: memoria.md não encontrado", file=sys.stderr)
        return 1

    context = build_context(project, "memoria.md")
    mem_bytes = memoria.stat().st_size
    ctx_bytes = len(dump_yaml(context))
    dec_count = len(context["exclusions"]) + len(context["pending"]) + len(context["candidates"])
    conv_rules = len(context.get("convention_rules", []))

    print("=== diff memoria.md → context.yaml ===")
    print(f"memoria.md:     {mem_bytes:6} bytes")
    print(f"context.yaml:   {ctx_bytes:6} bytes  ({100 * ctx_bytes / mem_bytes:.0f}% do original)")
    conv_path = review_dir(project) / "convencoes.md"
    if conv_path.is_file():
        conv_bytes = conv_path.stat().st_size
        total_v2 = ctx_bytes + conv_bytes
        print(f"convencoes.md:  {conv_bytes:6} bytes")
        print(f"v2 leitura:     {total_v2:6} bytes  ({100 * total_v2 / mem_bytes:.0f}% do memoria.md)")
    print(f"itens compactos: {dec_count} (+ {conv_rules} regras → convencoes.md no promover)")
    print(f"  exclusions:   {len(context['exclusions'])}")
    print(f"  pending:      {len(context['pending'])}")
    print(f"  conv.rules:   {len(context.get('convention_rules', []))}")
    print(f"  candidates:   {len(context['candidates'])}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Memória de review v2")
    parser.add_argument("command", choices=["status", "backup", "migrar", "compactar", "promover", "restore", "diff"])
    parser.add_argument("project", nargs="?", default=".")
    parser.add_argument("--write", action="store_true", help="Gravar arquivos (sem isso = dry-run)")
    parser.add_argument("--all", action="store_true", help="promover: incluir candidates com 1 ocorrência")
    args = parser.parse_intermixed_args()

    project = Path(args.project).resolve()

    handlers = {
        "status": lambda: cmd_status(project),
        "backup": lambda: cmd_backup(project),
        "migrar": lambda: cmd_migrar(project, args.write),
        "compactar": lambda: cmd_compactar(project, args.write),
        "promover": lambda: cmd_promover(project, args.write, args.all),
        "restore": lambda: cmd_restore(project, args.write),
        "diff": lambda: cmd_diff(project),
    }
    return handlers[args.command]()


if __name__ == "__main__":
    sys.exit(main())
