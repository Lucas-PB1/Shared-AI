/**
 * Unit tests — promoção de convenção (parse LLM + cobertura por key).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findCoveringConvention,
  isConventionLlmEnabled,
  parseConventionPromoteDecision,
  type ExistingConventionView,
} from "../../src/store/convention-promote.js";

describe("isConventionLlmEnabled", () => {
  it("respects explicit off", () => {
    assert.equal(
      isConventionLlmEnabled({ REVIEW_CONVENTION_LLM: "0", CURSOR_API_KEY: "x" }),
      false
    );
  });

  it("auto-on with API key", () => {
    assert.equal(
      isConventionLlmEnabled({ REVIEW_LLM_API_KEY: "sk" }),
      true
    );
  });
});

describe("findCoveringConvention", () => {
  const existing: ExistingConventionView[] = [
    {
      id: "a",
      findingKey: "prefer-const",
      body: "Use const",
      scopeGlob: "**/*",
      occurrences: 2,
      absorbedFindingKeys: ["use-const-not-let"],
      supersededBy: null,
    },
    {
      id: "b",
      findingKey: "old",
      body: "superseded",
      scopeGlob: "**/*",
      occurrences: 1,
      absorbedFindingKeys: [],
      supersededBy: "a",
    },
  ];

  it("matches primary finding_key", () => {
    assert.equal(findCoveringConvention(existing, "prefer-const")?.id, "a");
  });

  it("matches absorbed keys", () => {
    assert.equal(
      findCoveringConvention(existing, "use-const-not-let")?.id,
      "a"
    );
  });

  it("ignores superseded", () => {
    assert.equal(findCoveringConvention(existing, "old"), null);
  });
});

describe("parseConventionPromoteDecision", () => {
  it("parses create", () => {
    const d = parseConventionPromoteDecision(
      JSON.stringify({
        action: "create",
        body: "Sempre tipar props públicas.",
        scope_glob: "**/components/**",
        match_id: null,
        also_absorb_ids: [],
        rationale: "novo",
      }),
      { body: "fallback", scopeGlob: "**/*" }
    );
    assert.equal(d.action, "create");
    assert.match(d.body, /tipar props/);
    assert.equal(d.scopeGlob, "**/components/**");
  });

  it("falls back to create when merge lacks match_id", () => {
    const d = parseConventionPromoteDecision(
      JSON.stringify({
        action: "merge",
        body: "Merged body",
        scope_glob: "**/*",
        match_id: null,
      }),
      { body: "fallback", scopeGlob: "**/*" }
    );
    assert.equal(d.action, "create");
  });

  it("accepts fenced JSON", () => {
    const d = parseConventionPromoteDecision(
      '```json\n{"action":"skip","body":"x","match_id":"id-1","scope_glob":"**/*"}\n```',
      { body: "fallback", scopeGlob: "**/*" }
    );
    assert.equal(d.action, "skip");
    assert.equal(d.matchId, "id-1");
  });
});
