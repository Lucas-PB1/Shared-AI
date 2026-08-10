/**
 * Unit tests store (config, dual-write, publish, memory) — sem rede.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  StoreError,
  buildHeaders,
  dualWriteDecisions,
  formatExclusionsYaml,
  isStoreConfigured,
  isStoreRequired,
  loadConfig,
  mergeTextLayers,
  openStore,
  parseExclusionsYaml,
  publishRun,
  type CreateDecisionFields,
  type CreateFindingFields,
  type CreateRunFields,
  type ConventionFields,
  type ExclusionFields,
  type ListDecisionsOpts,
  type ReviewStorePort,
} from "../../src/store/index.js";
import {
  extractFindingTheme,
  slugify,
  stableFindingId,
} from "../../src/shared/index.js";
import {
  extractReportFilePath,
  parseFindingsFromReport,
} from "../../src/report/index.js";

describe("loadConfig", () => {
  it("reads env", () => {
    const cfg = loadConfig({
      env: {
        SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_SERVICE_ROLE_KEY: "test-key",
        REVIEW_PROJECT_SLUG: "demo-app",
      },
    });
    assert.equal(cfg.url, "http://127.0.0.1:54321");
    assert.equal(cfg.apiKey, "test-key");
    assert.equal(cfg.projectSlug, "demo-app");
    assert.equal(cfg.restBase, "http://127.0.0.1:54321/rest/v1");
  });

  it("requires url", () => {
    assert.throws(
      () => loadConfig({ env: { SUPABASE_SERVICE_ROLE_KEY: "k" } }),
      (e: unknown) =>
        e instanceof StoreError && /SUPABASE_URL/.test(e.message)
    );
  });

  it("requires key", () => {
    assert.throws(
      () => loadConfig({ env: { SUPABASE_URL: "http://x" } }),
      (e: unknown) => e instanceof StoreError && /Chave/.test(e.message)
    );
  });

  it("args override env", () => {
    const cfg = loadConfig({
      url: "http://override",
      apiKey: "ak",
      projectSlug: "s",
      env: {
        SUPABASE_URL: "http://env",
        SUPABASE_SERVICE_ROLE_KEY: "ek",
        REVIEW_PROJECT_SLUG: "env-slug",
      },
    });
    assert.equal(cfg.url, "http://override");
    assert.equal(cfg.apiKey, "ak");
    assert.equal(cfg.projectSlug, "s");
  });
});

describe("buildHeaders", () => {
  it("sets bearer and prefer", () => {
    const h = buildHeaders("secret", { prefer: "return=representation" });
    assert.equal(h.apikey, "secret");
    assert.equal(h.Authorization, "Bearer secret");
    assert.equal(h.Prefer, "return=representation");
  });
});

describe("isStoreConfigured / openStore / isStoreRequired", () => {
  it("false without env", () => {
    assert.equal(isStoreConfigured({}), false);
    assert.equal(openStore({ env: {} }), null);
  });

  it("true with url+key", () => {
    assert.equal(
      isStoreConfigured({
        SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_SERVICE_ROLE_KEY: "k",
      }),
      true
    );
  });

  it("always required (no offline)", () => {
    assert.equal(isStoreRequired({}), true);
    assert.equal(isStoreRequired({ REVIEW_STORE_REQUIRED: "0" }), true);
  });
});

function mockPort(calls: string[]): ReviewStorePort {
  return {
    async getProjectId() {
      calls.push("getProjectId");
      return "proj-1";
    },
    async createRun(_pid: string, fields?: CreateRunFields) {
      calls.push(`createRun:${fields?.source ?? "local"}`);
      return { id: "run-1" };
    },
    async completeRun(runId: string) {
      calls.push(`completeRun:${runId}`);
      return { id: runId, status: "completed" };
    },
    async createFinding(_runId: string, fields: CreateFindingFields) {
      calls.push(`createFinding:${fields.findingKey}`);
      return { id: "f1" };
    },
    async createDecision(_pid: string, fields: CreateDecisionFields) {
      calls.push(`createDecision:${fields.findingKey}:${fields.verdict}`);
      return { id: "d1" };
    },
    async upsertDecision(pid: string, fields: CreateDecisionFields) {
      calls.push(`upsertDecision:${fields.findingKey}`);
      return this.createDecision(pid, fields);
    },
    async listDecisions(_pid: string, _opts?: ListDecisionsOpts) {
      return [];
    },
    async listMemory() {
      return { projectId: "proj-1", decisions: [] };
    },
    async listExclusions() {
      return [
        {
          finding_key: "skip-pattern",
          reason: "falso positivo",
          scope_glob: "src/**",
          active: true,
        },
      ];
    },
    async listConventions() {
      return [
        {
          scope_glob: "src/**",
          body: "Prefer const",
          source: "test",
        },
      ];
    },
    async upsertExclusion(_pid: string, fields: ExclusionFields) {
      calls.push(`upsertExclusion:${fields.findingKey}`);
      return { id: "ex1" };
    },
    async upsertConvention(_pid: string, fields: ConventionFields) {
      calls.push(`upsertConvention:${fields.body}`);
      return { id: "cv1" };
    },
  };
}

describe("dualWriteDecisions", () => {
  it("errors when no store", async () => {
    const r = await dualWriteDecisions(
      [{ finding_id: "x", decision: "aceito" }],
      { port: null }
    );
    assert.equal(r.attempted, true);
    assert.equal(r.written, 0);
    assert.match(String(r.error), /Store obrigatório|SUPABASE_URL/);
  });

  it("writes allowed verdicts via port", async () => {
    const calls: string[] = [];
    const r = await dualWriteDecisions(
      [
        {
          finding_id: "null-check",
          decision: "rejeitado",
          summary: "Null",
          source: "github-pr-1",
          file: "src/a.ts",
          line: 10,
        },
        {
          finding_id: "later",
          decision: "adiado",
          summary: "Later",
        },
        {
          finding_id: "const",
          decision: "aceito",
          summary: "Prefer const",
        },
      ],
      {
        port: mockPort(calls),
        run: { source: "ci", prNumber: 1 },
      }
    );
    assert.equal(r.attempted, true);
    assert.equal(r.written, 2);
    assert.equal(r.skipped, 1);
    assert.equal(r.runId, "run-1");
    assert.ok(!r.error);
    assert.ok(calls.includes("getProjectId"));
    assert.ok(calls.includes("createRun:ci"));
    assert.ok(calls.some((c) => c.startsWith("upsertDecision:null-check")));
    assert.ok(calls.includes("completeRun:run-1"));
  });

  it("returns error on port failure", async () => {
    const port: ReviewStorePort = {
      ...mockPort([]),
      async getProjectId() {
        throw new StoreError("boom");
      },
    };
    const r = await dualWriteDecisions(
      [{ finding_id: "x", decision: "aceito" }],
      { port }
    );
    assert.equal(r.attempted, true);
    assert.match(String(r.error), /boom/);
  });
});

describe("publishRun", () => {
  it("errors when no store", async () => {
    const r = await publishRun(
      [{ findingKey: "a", summary: "A" }],
      { port: null }
    );
    assert.equal(r.attempted, true);
    assert.equal(r.findings, 0);
    assert.match(String(r.error), /Store obrigatório|SUPABASE_URL/);
  });

  it("writes findings", async () => {
    const calls: string[] = [];
    const r = await publishRun(
      [
        { findingKey: "k1", summary: "One" },
        { findingKey: "k2", summary: "Two", filePath: "a.ts" },
      ],
      { port: mockPort(calls), run: { source: "ci", prNumber: 9 } }
    );
    assert.equal(r.attempted, true);
    assert.equal(r.findings, 2);
    assert.equal(r.runId, "run-1");
    assert.ok(calls.includes("createRun:ci"));
    assert.ok(calls.includes("createFinding:k1"));
    assert.ok(calls.includes("completeRun:run-1"));
  });
});

describe("memory format", () => {
  it("formats exclusions yaml", () => {
    const yaml = formatExclusionsYaml([
      {
        findingKey: "fp",
        reason: "ok pattern",
        scopeGlob: "src/**",
        active: true,
      },
    ]);
    assert.ok(yaml.includes("finding"));
    assert.ok(yaml.includes("ok pattern"));
    assert.ok(yaml.includes("fp"));
  });

  it("parses exclusions yaml", () => {
    const items = parseExclusionsYaml(`
exclusions:
  - scope: src/**
    decision: rejeitado
    reason: foo bar
    id: foo-bar
`);
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "foo-bar");
    assert.equal(items[0].scope, "src/**");
  });

  it("merges layers", () => {
    assert.equal(mergeTextLayers("a", "b"), "a\nb");
    assert.equal(mergeTextLayers("", "b"), "b");
  });
});

describe("parseFindingsFromReport", () => {
  it("extracts marker and title", () => {
    const md = `
## \`src/x.ts\`

#### x.ts:10 — missing await
<!-- avaliar-inline:src/x.ts:10:fid:missing-await -->

**Em português:**
> Falta await aqui
`;
    assert.equal(extractReportFilePath(md), "src/x.ts");
    const findings = parseFindingsFromReport(md, "src/x.ts");
    assert.equal(findings.length, 1);
    assert.equal(findings[0].findingKey, "missing-await");
    assert.equal(findings[0].lineStart, 10);
    assert.match(findings[0].summary, /await/i);
  });
});

describe("finding-ids", () => {
  it("strips file:line theme", () => {
    assert.equal(
      extractFindingTheme("src/Foo.ts:12 — missing await"),
      "missing await"
    );
    assert.equal(
      stableFindingId("src/Foo.ts:12 — missing await"),
      "missing-await"
    );
  });

  it("slugify truncates", () => {
    const long = "a".repeat(100);
    assert.equal(slugify(long).length, 80);
  });
});
