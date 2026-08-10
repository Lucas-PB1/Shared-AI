#!/usr/bin/env python3
"""Smoke unitário do ingest (sem gh / rede).

Carrega review-ingest-pr-decisions.py e valida classify_thread + parsers.
Uso: python3 tests/smoke_review_ingest.py
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "packages" / "code-review" / "tools"
MOD_PATH = TOOLS / "review-ingest-pr-decisions.py"


def load_ingest():
    spec = importlib.util.spec_from_file_location("review_ingest_pr", MOD_PATH)
    if spec is None or spec.loader is None:
        raise SystemExit(f"não carregou {MOD_PATH}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def thread(
    root_body: str,
    *,
    human_body: str | None = None,
    path: str = "src/ok.mjs",
    line: int = 1,
    resolved: bool = False,
) -> dict:
    nodes = [
        {
            "body": root_body,
            "path": path,
            "line": line,
            "originalLine": line,
            "author": {"login": "github-actions[bot]"},
            "commit": {"oid": "abc"},
        }
    ]
    if human_body is not None:
        nodes.append(
            {
                "body": human_body,
                "path": path,
                "line": line,
                "author": {"login": "dev-user"},
            }
        )
    return {"isResolved": resolved, "comments": {"nodes": nodes}}


def main() -> int:
    mod = load_ingest()
    project = Path(".")
    marker = "<!-- avaliar-inline:src/ok.mjs:1:fid:test-finding -->\n"

    # rejeição por reply humano
    d = mod.classify_thread(
        thread(marker + "Null check missing\n", human_body="false positive, ignorar"),
        True,
        "mergeoid",
        "baseoid",
        "headoid",
        project,
        42,
    )
    assert d is not None, "expected decision"
    assert d["decision"] == "rejeitado", d
    assert d.get("finding_id"), d

    # nao-aplicavel
    d = mod.classify_thread(
        thread(marker + "Só afeta edge\n", human_body="só preview, não se aplica"),
        True,
        "m",
        "b",
        "h",
        project,
        1,
    )
    assert d is not None and d["decision"] == "nao-aplicavel", d

    # aceito: reply sem rejeição
    d = mod.classify_thread(
        thread(marker + "Validar entrada\n", human_body="faz sentido, obrigado"),
        True,
        "m",
        "b",
        "h",
        project,
        2,
    )
    assert d is not None and d["decision"] == "aceito", d

    # sem marker → None
    d = mod.classify_thread(
        thread("comentário genérico", human_body="ok"),
        True,
        "m",
        "b",
        "h",
        project,
        3,
    )
    assert d is None

    # parsers
    owner, name = mod.parse_repo("HostDimeBR/hostdime-ia")
    assert owner == "HostDimeBR" and name == "hostdime-ia"

    de, para = mod.extract_de_para_from_body(
        "**De:**\n\n```js\nold()\n```\n\n**Para:**\n\n```js\nnew()\n```\n"
    )
    assert "old()" in de and "new()" in para, (de, para)

    summary = mod.extract_summary(marker + "Primeira linha útil\nsegunda")
    assert summary.startswith("Primeira"), summary

    print("smoke_review_ingest: OK")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"smoke_review_ingest FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
