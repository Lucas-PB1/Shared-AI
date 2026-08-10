/**
 * Unit tests memory/merge.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  globMatchesFile,
  inferScopeFromFile,
  mergeHistoryIntoContext,
  mergePromotedIntoConvencoes,
  parseConvencoesSections,
  type DecisionLike,
} from "../../src/memory/index.js";

describe("scope and glob", () => {
  it("infer scope map", () => {
    assert.equal(
      inferScopeFromFile("components/HdbrDedicatedSimulator/X.tsx"),
      "**/HdbrDedicatedSimulator/**"
    );
    assert.equal(
      inferScopeFromFile("simulator-core/foo.ts"),
      "**/simulator-core/**"
    );
    assert.equal(inferScopeFromFile("src/foo/bar.ts"), "src/foo/**");
    assert.equal(inferScopeFromFile(""), "**/*");
  });

  it("glob matches", () => {
    assert.equal(globMatchesFile("**/*", "a/b.ts"), true);
    assert.equal(globMatchesFile("src/**", "src/a.ts"), true);
    assert.equal(globMatchesFile("src/**", "lib/a.ts"), false);
    assert.equal(globMatchesFile("*.tsx", "App.tsx"), true);
  });
});

describe("convencoes", () => {
  it("parse and merge", () => {
    const existing = `# Convenções

## Escopo: app/**

- Use FormRequest
`;
    const [, sections] = parseConvencoesSections(existing);
    assert.equal(sections.length, 1);
    assert.deepEqual(sections[0].bullets, ["Use FormRequest"]);

    const [merged, added] = mergePromotedIntoConvencoes(existing, {
      "app/**": ["Use FormRequest", "Validar CPF"],
      "new/**": ["Nova regra"],
    });
    assert.equal(added, 2);
    assert.match(merged, /Validar CPF/);
    assert.match(merged, /## Escopo: new\/\*\*/);
    const [, added2] = mergePromotedIntoConvencoes(merged, {
      "app/**": ["Validar CPF"],
    });
    assert.equal(added2, 0);
  });
});

describe("merge history", () => {
  it("decisions to exclusions and candidates", () => {
    const decisions: DecisionLike[] = [
      {
        finding_id: "null-check",
        decision: "rejeitado",
        file: "src/a.ts",
        line: 1,
        review_slug: "pr-1",
        summary: "Null check",
        reason: "intencional",
        finalized_at: "2026-08-10T00:00:00Z",
        source: "github-pr-1",
      },
      {
        finding_id: "use-const",
        decision: "aceito",
        file: "src/b.ts",
        line: 2,
        review_slug: "pr-1",
        summary: "Prefer const",
        reason: "faz sentido",
        finalized_at: "2026-08-10T00:00:00Z",
        source: "github-pr-1",
      },
      {
        finding_id: "later",
        decision: "adiado",
        file: "src/c.ts",
        line: 3,
        review_slug: "pr-1",
        summary: "Later",
        finalized_at: "2026-08-10T00:00:00Z",
        source: "local",
      },
    ];
    const [excl, pending, cand] = mergeHistoryIntoContext(decisions, [], []);
    assert.equal(excl.length, 1);
    assert.equal(excl[0].id, "null-check");
    assert.equal(excl[0].inferred_from, "decisions-ingest.jsonl");
    assert.equal(pending.length, 1);
    assert.equal(cand.length, 1);
    assert.equal(cand[0].occurrences, 1);

    const again = decisions[1];
    const [, , cand2] = mergeHistoryIntoContext([again, again], [], cand);
    assert.equal(cand2.length, 1);
    assert.ok(Number(cand2[0].occurrences) >= 2);
  });
});
