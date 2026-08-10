#!/usr/bin/env python3
"""Unit tests lib/memoria_core.py."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from lib.memoria_core import (  # noqa: E402
    glob_matches_file,
    infer_scope_from_file,
    merge_history_into_context,
    merge_promoted_into_convencoes,
    parse_convencoes_sections,
)


class ScopeAndGlobTest(unittest.TestCase):
    def test_infer_scope_map(self) -> None:
        self.assertEqual(
            infer_scope_from_file("components/HdbrDedicatedSimulator/X.tsx"),
            "**/HdbrDedicatedSimulator/**",
        )
        self.assertEqual(
            infer_scope_from_file("simulator-core/foo.ts"),
            "**/simulator-core/**",
        )
        self.assertEqual(infer_scope_from_file("src/foo/bar.ts"), "src/foo/**")
        self.assertEqual(infer_scope_from_file(""), "**/*")

    def test_glob_matches(self) -> None:
        self.assertTrue(glob_matches_file("**/*", "a/b.ts"))
        self.assertTrue(glob_matches_file("src/**", "src/a.ts"))
        self.assertFalse(glob_matches_file("src/**", "lib/a.ts"))
        self.assertTrue(glob_matches_file("*.tsx", "App.tsx"))


class ConvencoesTest(unittest.TestCase):
    def test_parse_and_merge(self) -> None:
        existing = """# Convenções

## Escopo: app/**

- Use FormRequest
"""
        preamble, sections = parse_convencoes_sections(existing)
        self.assertEqual(len(sections), 1)
        self.assertEqual(sections[0]["bullets"], ["Use FormRequest"])

        merged, added = merge_promoted_into_convencoes(
            existing,
            {"app/**": ["Use FormRequest", "Validar CPF"], "new/**": ["Nova regra"]},
        )
        self.assertEqual(added, 2)
        self.assertIn("Validar CPF", merged)
        self.assertIn("## Escopo: new/**", merged)
        # dedupe
        again, added2 = merge_promoted_into_convencoes(merged, {"app/**": ["Validar CPF"]})
        self.assertEqual(added2, 0)
        del again


class MergeHistoryTest(unittest.TestCase):
    def test_decisions_to_exclusions_and_candidates(self) -> None:
        decisions = [
            {
                "finding_id": "null-check",
                "decision": "rejeitado",
                "file": "src/a.ts",
                "line": 1,
                "review_slug": "pr-1",
                "summary": "Null check",
                "reason": "intencional",
                "finalized_at": "2026-08-10T00:00:00Z",
                "source": "github-pr-1",
            },
            {
                "finding_id": "use-const",
                "decision": "aceito",
                "file": "src/b.ts",
                "line": 2,
                "review_slug": "pr-1",
                "summary": "Prefer const",
                "reason": "faz sentido",
                "finalized_at": "2026-08-10T00:00:00Z",
                "source": "github-pr-1",
            },
            {
                "finding_id": "later",
                "decision": "adiado",
                "file": "src/c.ts",
                "line": 3,
                "review_slug": "pr-1",
                "summary": "Later",
                "finalized_at": "2026-08-10T00:00:00Z",
                "source": "local",
            },
        ]
        excl, pending, cand = merge_history_into_context(decisions, [], [])
        self.assertEqual(len(excl), 1)
        self.assertEqual(excl[0]["id"], "null-check")
        self.assertEqual(excl[0]["inferred_from"], "decisions-ingest.jsonl")
        self.assertEqual(len(pending), 1)
        self.assertEqual(len(cand), 1)
        self.assertEqual(cand[0]["occurrences"], 1)

        # second aceito same id increments
        again = decisions[1]
        _, _, cand2 = merge_history_into_context([again, again], [], cand)
        self.assertEqual(len(cand2), 1)
        self.assertGreaterEqual(cand2[0]["occurrences"], 2)


if __name__ == "__main__":
    unittest.main()
