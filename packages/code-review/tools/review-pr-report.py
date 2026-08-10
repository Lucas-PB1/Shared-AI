#!/usr/bin/env python3
"""CLI de helpers puras do review-github-pr (sem rede).

Comandos:
  parse-verdict          stdin → veredito
  finding-id TEXT|stdin  → finding_id estável
  inline-marker FILE LINE TITLE → marker HTML
  format-files-table     stdin TSV → JSON {table,stats}
  extract-title          stdin block → título ####
  extract-pt             stdin block → resumo PT
  normalize-snippet      stdin → snippet normalizado
  snippets-match A B     exit 0 se iguais (args ou -- a/b files)
  block-score            stdin block → score int
  file-priority ACTION VERDICT INLINE BLOCKING → "prio\\ticon"
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_TOOLS = Path(__file__).resolve().parent
if str(_TOOLS) not in sys.path:
    sys.path.insert(0, str(_TOOLS))

from lib.finding_ids import stable_finding_id  # noqa: E402
from lib.pr_report import (  # noqa: E402
    build_inline_marker,
    code_snippets_match,
    extract_block_title,
    extract_pt_summary,
    file_row_priority,
    format_summary_table,
    inline_block_score,
    normalize_code_snippet,
    parse_verdict,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Helpers de review PR (puros)")
    parser.add_argument(
        "command",
        choices=[
            "parse-verdict",
            "finding-id",
            "inline-marker",
            "format-files-table",
            "extract-title",
            "extract-pt",
            "normalize-snippet",
            "snippets-match",
            "block-score",
            "file-priority",
        ],
    )
    parser.add_argument("args", nargs="*", help="Argumentos do comando")
    ns = parser.parse_args()
    cmd = ns.command
    args = ns.args

    if cmd == "parse-verdict":
        print(parse_verdict(sys.stdin.read()), end="")
        return 0

    if cmd == "finding-id":
        text = " ".join(args).strip() if args else sys.stdin.read().strip()
        if not text:
            print("Erro: informe título", file=sys.stderr)
            return 1
        print(stable_finding_id(text), end="")
        return 0

    if cmd == "inline-marker":
        if len(args) < 3:
            print("Uso: inline-marker FILE LINE TITLE", file=sys.stderr)
            return 1
        print(build_inline_marker(args[0], args[1], " ".join(args[2:])), end="")
        return 0

    if cmd == "format-files-table":
        table, stats = format_summary_table(sys.stdin.read())
        print(json.dumps({"table": table, "stats": stats}, ensure_ascii=False))
        return 0

    if cmd == "extract-title":
        print(extract_block_title(sys.stdin.read()), end="")
        return 0

    if cmd == "extract-pt":
        print(extract_pt_summary(sys.stdin.read()), end="")
        return 0

    if cmd == "normalize-snippet":
        print(normalize_code_snippet(sys.stdin.read()), end="")
        return 0

    if cmd == "snippets-match":
        if len(args) < 2:
            print("Uso: snippets-match EXPECTED ACTUAL", file=sys.stderr)
            return 1
        return 0 if code_snippets_match(args[0], args[1]) else 1

    if cmd == "block-score":
        print(inline_block_score(sys.stdin.read()), end="")
        return 0

    if cmd == "file-priority":
        if len(args) < 4:
            print("Uso: file-priority ACTION VERDICT INLINE BLOCKING", file=sys.stderr)
            return 1
        prio, icon = file_row_priority(args[0], args[1], int(args[2]), int(args[3]))
        print(f"{prio}\t{icon}", end="")
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
