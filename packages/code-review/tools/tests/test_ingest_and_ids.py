#!/usr/bin/env python3
"""Unit tests: finding_ids + regras de ingest (sem gh).

Uso:
  python3 -m unittest packages.code-review.tools.tests...  # se package
  python3 packages/code-review/tools/tests/test_ingest_and_ids.py
  npm run test:review-unit
"""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]
ROOT = TOOLS.parents[2]
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from lib.finding_ids import (  # noqa: E402
    extract_finding_theme,
    slugify,
    stable_finding_id,
)
from lib.ingest_decisions import (  # noqa: E402
    classify_thread,
    extract_de_para_from_body,
    extract_summary,
    fix_applied_in_pr,
    parse_repo,
    snippet_in_file,
    upsert_pr_decisions,
)


def _thread(
    root_body: str,
    *,
    human_body: str | None = None,
    path: str = "src/ok.mjs",
    line: int = 1,
    resolved: bool = False,
    human_login: str = "dev-user",
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
                "author": {"login": human_login},
            }
        )
    return {"isResolved": resolved, "comments": {"nodes": nodes}}


MARKER = "<!-- avaliar-inline:src/ok.mjs:1:fid:test-finding -->\n"


class FindingIdsTest(unittest.TestCase):
    def test_theme_strips_path_line(self) -> None:
        self.assertEqual(
            extract_finding_theme("src/Foo.tsx:12 — Null check missing"),
            "Null check missing",
        )

    def test_stable_id_ignores_path(self) -> None:
        a = stable_finding_id("app/A.tsx:10 — Validar FormRequest")
        b = stable_finding_id("app/B.tsx:99 — Validar FormRequest")
        self.assertEqual(a, b)
        self.assertEqual(a, "validar-formrequest")

    def test_slugify_limits(self) -> None:
        self.assertEqual(slugify(""), "finding")
        long = "x" * 200
        self.assertLessEqual(len(slugify(long)), 80)


class IngestRulesTest(unittest.TestCase):
    def test_parse_repo(self) -> None:
        self.assertEqual(parse_repo("HostDimeBR/hostdime-ia"), ("HostDimeBR", "hostdime-ia"))
        with self.assertRaises(ValueError):
            parse_repo("invalid")

    def test_extract_summary_skips_marker(self) -> None:
        body = MARKER + "Null check missing\nmore"
        self.assertEqual(extract_summary(body), "Null check missing")

    def test_extract_de_para(self) -> None:
        de, para = extract_de_para_from_body(
            "**De:**\n\n```js\nold()\n```\n\n**Para:**\n\n```js\nnew()\n```\n"
        )
        self.assertIn("old()", de)
        self.assertIn("new()", para)

    def test_snippet_in_file(self) -> None:
        content = "function a() {\n  return 1\n}\n"
        self.assertTrue(snippet_in_file(content, "return 1"))
        self.assertFalse(snippet_in_file(content, "return 2"))

    def test_human_reject(self) -> None:
        d = classify_thread(
            _thread(MARKER + "Issue\n", human_body="false positive, ignore"),
            True,
            "m",
            "b",
            "h",
            Path("."),
            10,
            now="2026-08-10T00:00:00Z",
        )
        assert d is not None
        self.assertEqual(d["decision"], "rejeitado")
        self.assertEqual(d["finding_id"], "test-finding")

    def test_human_nao_aplicavel(self) -> None:
        d = classify_thread(
            _thread(MARKER + "Edge\n", human_body="só preview, fora do escopo"),
            True,
            "m",
            "b",
            "h",
            Path("."),
            11,
            now="2026-08-10T00:00:00Z",
        )
        assert d is not None
        self.assertEqual(d["decision"], "nao-aplicavel")

    def test_human_accept_no_objection(self) -> None:
        d = classify_thread(
            _thread(MARKER + "Validar\n", human_body="faz sentido"),
            True,
            "m",
            "b",
            "h",
            Path("."),
            12,
            now="2026-08-10T00:00:00Z",
        )
        assert d is not None
        self.assertEqual(d["decision"], "aceito")

    def test_bot_reply_ignored_as_human(self) -> None:
        # reply only from bot → treated as no human; merge without fix → rejeitado
        d = classify_thread(
            _thread(MARKER + "Still there\n", human_body="ok", human_login="github-actions[bot]"),
            True,
            "m",
            "b",
            "h",
            Path("."),
            13,
            now="2026-08-10T00:00:00Z",
            show_file=lambda *_a, **_k: "Still there\n",
            list_commits=lambda *_a, **_k: [],
        )
        assert d is not None
        self.assertEqual(d["decision"], "rejeitado")

    def test_merge_no_reply_rejected(self) -> None:
        d = classify_thread(
            _thread(MARKER + "Achado ignorado\n"),
            True,
            "m",
            "b",
            "h",
            Path("."),
            14,
            now="2026-08-10T00:00:00Z",
            show_file=lambda *_a, **_k: "Achado ignorado\n",
            list_commits=lambda *_a, **_k: [],
        )
        assert d is not None
        self.assertEqual(d["decision"], "rejeitado")
        self.assertIn("sem resposta", d["reason"])

    def test_resolved_without_human_accepted(self) -> None:
        d = classify_thread(
            _thread(MARKER + "X\n", resolved=True),
            True,
            "m",
            "b",
            "h",
            Path("."),
            15,
            now="2026-08-10T00:00:00Z",
            show_file=lambda *_a, **_k: "",
            list_commits=lambda *_a, **_k: [],
        )
        assert d is not None
        self.assertEqual(d["decision"], "aceito")

    def test_fix_intra_pr_aceito(self) -> None:
        # Para aplicada no merge
        body = (
            MARKER
            + "Use const\n\n**De:**\n\n```js\nlet x = 1\n```\n\n**Para:**\n\n```js\nconst x = 1\n```\n"
        )
        files = {
            "m": "const x = 1\n",
            "h": "const x = 1\n",
        }

        def show(_p: Path, sha: str, _f: str) -> str:
            return files.get(sha, "")

        applied, reason = fix_applied_in_pr(
            Path("."),
            base_oid="b",
            head_oid="h",
            merge_oid="m",
            file_path="src/ok.mjs",
            line=1,
            de_code="let x = 1",
            para_code="const x = 1",
            body=body,
            show_file=show,
            list_commits=lambda *_a, **_k: ["h"],
        )
        self.assertTrue(applied)
        self.assertIn("Para", reason)

        d = classify_thread(
            _thread(body),
            True,
            "m",
            "b",
            "h",
            Path("."),
            16,
            now="2026-08-10T00:00:00Z",
            show_file=show,
            list_commits=lambda *_a, **_k: ["h"],
        )
        assert d is not None
        self.assertEqual(d["decision"], "aceito")

    def test_re_ingest_replaces_same_pr_source(self) -> None:
        # regressão: re-ingest substitui decisões do mesmo PR
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "decisions-ingest.jsonl"
            path.write_text(
                '{"source":"github-pr-7","summary":"old","finding_id":"old"}\n'
                '{"source":"github-pr-1","summary":"keep me","finding_id":"keep-me"}\n',
                encoding="utf-8",
            )
            added = upsert_pr_decisions(
                path,
                7,
                [
                    {
                        "source": "github-pr-7",
                        "summary": "new finding",
                        "decision": "aceito",
                    }
                ],
            )
            self.assertEqual(len(added), 1)
            text = path.read_text(encoding="utf-8")
            self.assertIn("github-pr-1", text)
            self.assertIn("new finding", text)
            self.assertNotIn('"summary": "old"', text)
            self.assertEqual(text.count("github-pr-7"), 1)


if __name__ == "__main__":
    unittest.main()
