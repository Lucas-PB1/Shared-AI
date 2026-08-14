/**
 * Unit tests — reconcile de convenção (keywords + lógica).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findCoveringConvention,
  findNearCoveringConvention,
  heuristicReconcileClusters,
  isConventionLlmEnabled,
  parseReconcileLlmResponse,
  prNumberFromDecisionSource,
  provenanceFromDecisions,
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
      evidence: [
        {
          finding_key: "prefer-const",
          summary: "prefer const",
          decision_source: "github-pr-68",
          pr: 68,
        },
      ],
      evidenceCount: 2,
      relatedPrs: [68],
      supersededBy: null,
    },
    {
      id: "b",
      findingKey: "old",
      body: "superseded",
      scopeGlob: "**/*",
      occurrences: 1,
      absorbedFindingKeys: [],
      evidence: [],
      evidenceCount: 0,
      relatedPrs: [],
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

describe("findNearCoveringConvention", () => {
  it("redirects near slug to existing convention", () => {
    const hit = findNearCoveringConvention(
      [
        {
          id: "cv1",
          findingKey: "title-trim-guarda",
          body: "trim guard",
          scopeGlob: "**/*",
          occurrences: 2,
          absorbedFindingKeys: ["tag-label-trim-guarda"],
          evidence: [],
          evidenceCount: 2,
          relatedPrs: [69],
          supersededBy: null,
        },
      ],
      ["cta-text-trim-guarda"]
    );
    assert.equal(hit?.convention.id, "cv1");
    assert.ok((hit?.score ?? 0) >= 0.34);
  });
});

describe("parseReconcileLlmResponse", () => {
  it("parses logical clusters ignoring slug", () => {
    const { clusters, deferredFindingKeys } = parseReconcileLlmResponse(
      JSON.stringify({
        clusters: [
          {
            action: "create",
            finding_keys: ["a-key", "b-key"],
            body: "Uma regra",
            scope_glob: "**/*",
            match_id: null,
            also_absorb_ids: [],
            rationale: "same logic",
          },
        ],
        deferred_finding_keys: ["lonely"],
      })
    );
    assert.equal(clusters.length, 1);
    assert.deepEqual(clusters[0].findingKeys, ["a-key", "b-key"]);
    assert.deepEqual(deferredFindingKeys, ["lonely"]);
  });
});

describe("heuristicReconcileClusters", () => {
  it("defers singles and creates on threshold", () => {
    const { clusters, deferredFindingKeys } = heuristicReconcileClusters([
      {
        findingKey: "once",
        summary: "Once",
        scopeGlob: "**/*",
        occurrences: 1,
        relatedPrs: [1],
      },
      {
        findingKey: "twice",
        summary: "Twice",
        scopeGlob: "**/*",
        occurrences: 2,
        relatedPrs: [2],
      },
    ]);
    assert.deepEqual(deferredFindingKeys, ["once"]);
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].findingKeys[0], "twice");
  });
});

describe("provenanceFromDecisions", () => {
  it("builds evidence from aceito decisions (PR is only related context)", () => {
    assert.equal(prNumberFromDecisionSource("github-pr-69"), 69);
    assert.equal(prNumberFromDecisionSource("other"), null);
    const p = provenanceFromDecisions(
      [
        {
          id: "d1",
          verdict: "aceito",
          finding_key: "a",
          summary: "Rule A",
          source: "github-pr-68",
        },
        {
          id: "d2",
          verdict: "aceito",
          finding_key: "b",
          summary: "Rule B",
          source: "github-pr-69",
        },
        {
          verdict: "rejeitado",
          finding_key: "a",
          source: "github-pr-70",
        },
      ],
      ["a", "b"]
    );
    assert.equal(p.evidenceCount, 2);
    assert.deepEqual(
      p.evidence.map((e) => e.finding_key),
      ["a", "b"]
    );
    assert.deepEqual(p.relatedPrs, [68, 69]);
  });
});
