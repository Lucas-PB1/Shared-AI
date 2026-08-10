/**
 * Unit tests src/store + finding-ids (sem rede).
 * tsx --test packages/code-review/tests/store.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { StoreError, buildHeaders, loadConfig } from "../src/store/index.js";
import {
  extractFindingTheme,
  slugify,
  stableFindingId,
} from "../src/finding-ids.js";

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
