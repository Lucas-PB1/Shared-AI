#!/usr/bin/env python3
"""Unit tests para lib/pr_report.py (veredito, resumo, markers)."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from lib.pr_report import (  # noqa: E402
    VERDICT_NEEDS_CHANGES,
    VERDICT_NOT_RECOMMENDED,
    VERDICT_OK,
    build_inline_comment_body,
    build_inline_marker,
    code_snippets_match,
    extract_block_title,
    extract_pt_summary,
    file_row_priority,
    format_summary_table,
    inline_block_score,
    normalize_code_snippet,
    parse_verdict,
    report_has_impeditivo,
    verdict_is_failure,
)


SAMPLE_BLOCK = """#### src/Foo.tsx:12 — Null check missing

**Em português:**
> Falta validar nulo antes de acessar.

**De:**

```ts
x.y
```

**Para:**

```ts
x?.y
```
"""


class VerdictTest(unittest.TestCase):
    def test_ok(self) -> None:
        self.assertEqual(parse_verdict("**Stack:** TS\n\n**Veredito:** OK\n"), VERDICT_OK)

    def test_nao_recomendado(self) -> None:
        self.assertEqual(
            parse_verdict("**Veredito:** Não recomendado\n"),
            VERDICT_NOT_RECOMMENDED,
        )

    def test_ajustes(self) -> None:
        self.assertEqual(
            parse_verdict("**Veredito:** Ajustes necessários\n"),
            VERDICT_NEEDS_CHANGES,
        )

    def test_default_ajustes(self) -> None:
        self.assertEqual(parse_verdict("sem veredito"), VERDICT_NEEDS_CHANGES)

    def test_failure_flag(self) -> None:
        self.assertFalse(verdict_is_failure(VERDICT_OK))
        self.assertTrue(verdict_is_failure(VERDICT_NEEDS_CHANGES))

    def test_impeditivo_section(self) -> None:
        self.assertTrue(report_has_impeditivo("### Impeditivo\n- crash\n"))
        self.assertTrue(report_has_impeditivo("**Veredito:** Não recomendado\n"))
        self.assertFalse(report_has_impeditivo("**Veredito:** OK\n"))


class PriorityTest(unittest.TestCase):
    def test_priority_order(self) -> None:
        self.assertEqual(file_row_priority("skip", "—", 0, 0)[0], 4)
        self.assertEqual(file_row_priority("review", "OK", 0, 1)[0], 1)
        self.assertEqual(file_row_priority("review", "OK", 2, 0)[0], 2)
        self.assertEqual(file_row_priority("review", "Ajustes necessários", 0, 0)[0], 2)
        self.assertEqual(file_row_priority("review", "OK", 0, 0)[0], 3)

    def test_format_table_sorted_by_priority(self) -> None:
        log = "\n".join(
            [
                "skip\ta.ts\t—\t0\t0",
                "review\tb.ts\tOK\t0\t0",
                "review\tc.ts\tAjustes necessários\t1\t0",
                "review\td.ts\tNão recomendado\t0\t2",
            ]
        )
        table, stats = format_summary_table(log)
        lines = [ln for ln in table.splitlines() if ln.startswith("|")]
        self.assertEqual(len(lines), 4)
        # d impeditivo first, then c with inline, then b ok, then a skip
        self.assertIn("d.ts", lines[0])
        self.assertIn("impeditivo", lines[0])
        self.assertIn("c.ts", lines[1])
        self.assertIn("b.ts", lines[2])
        self.assertIn("a.ts", lines[3])
        self.assertEqual(stats["reviewed"], 3)
        self.assertEqual(stats["skipped"], 1)
        self.assertEqual(stats["failed"], 2)
        self.assertEqual(stats["blocking_this_run"], 2)
        self.assertEqual(stats["inline_this_run"], 1)


class BlockHelpersTest(unittest.TestCase):
    def test_title_and_pt(self) -> None:
        self.assertEqual(
            extract_block_title(SAMPLE_BLOCK),
            "src/Foo.tsx:12 — Null check missing",
        )
        self.assertIn("validar nulo", extract_pt_summary(SAMPLE_BLOCK).lower())

    def test_inline_marker_uses_stable_id(self) -> None:
        m = build_inline_marker(
            "src/Foo.tsx",
            12,
            "src/Foo.tsx:12 — Null check missing",
        )
        self.assertIn("avaliar-inline:src/Foo.tsx:12:fid:", m)
        self.assertIn("null-check-missing", m)

    def test_snippet_normalize_match(self) -> None:
        a = "  foo()\n\n  bar()  "
        b = "foo()\nbar()"
        self.assertEqual(normalize_code_snippet(a), "foo()\nbar()")
        self.assertTrue(code_snippets_match(a, b))
        self.assertFalse(code_snippets_match("a", "b"))

    def test_block_score(self) -> None:
        self.assertEqual(inline_block_score("#### x\n"), 0)
        self.assertEqual(inline_block_score("**De:**\n**Para:**\n"), 5)

    def test_inline_comment_body(self) -> None:
        body = build_inline_comment_body(SAMPLE_BLOCK)
        self.assertIn("Null check", body)
        self.assertIn("nulo", body.lower())


if __name__ == "__main__":
    unittest.main()
