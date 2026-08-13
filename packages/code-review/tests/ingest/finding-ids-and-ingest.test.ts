/**
 * Unit tests: finding-ids + regras de ingest (sem gh).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  extractFindingTheme,
  slugify,
  stableFindingId,
} from "../../src/shared/index.js";
import {
  classifyThread,
  extractDeParaFromBody,
  extractSummary,
  fixAppliedInPr,
  parseRepo,
  snippetInFile,
  upsertPrDecisions,
} from "../../src/ingest/index.js";

function thread(
  rootBody: string,
  opts: {
    humanBody?: string | null;
    path?: string;
    line?: number;
    resolved?: boolean;
    humanLogin?: string;
    rootLogin?: string;
  } = {}
) {
  const filePath = opts.path ?? "src/ok.mjs";
  const line = opts.line ?? 1;
  const nodes: Array<Record<string, unknown>> = [
    {
      body: rootBody,
      path: filePath,
      line,
      originalLine: line,
      author: { login: opts.rootLogin ?? "github-actions[bot]" },
      commit: { oid: "abc" },
    },
  ];
  if (opts.humanBody !== undefined && opts.humanBody !== null) {
    nodes.push({
      body: opts.humanBody,
      path: filePath,
      line,
      author: { login: opts.humanLogin ?? "dev-user" },
    });
  }
  return {
    isResolved: opts.resolved ?? false,
    comments: { nodes },
  };
}

const MARKER = "<!-- avaliar-inline:src/ok.mjs:1:fid:test-finding -->\n";

describe("finding-ids", () => {
  it("theme strips path:line", () => {
    assert.equal(
      extractFindingTheme("src/Foo.tsx:12 — Null check missing"),
      "Null check missing"
    );
  });

  it("stable id ignores path", () => {
    const a = stableFindingId("app/A.tsx:10 — Validar FormRequest");
    const b = stableFindingId("app/B.tsx:99 — Validar FormRequest");
    assert.equal(a, b);
    assert.equal(a, "validar-formrequest");
  });

  it("slugify limits", () => {
    assert.equal(slugify(""), "finding");
    const long = "x".repeat(200);
    assert.ok(slugify(long).length <= 80);
  });
});

describe("ingest rules", () => {
  it("parse_repo", () => {
    assert.deepEqual(parseRepo("HostDimeBR/hostdime-ia"), [
      "HostDimeBR",
      "hostdime-ia",
    ]);
    assert.throws(() => parseRepo("invalid"), /inválido/);
  });

  it("extract_summary skips marker", () => {
    const body = MARKER + "Null check missing\nmore";
    assert.equal(extractSummary(body), "Null check missing");
  });

  it("extract de/para", () => {
    const [de, para] = extractDeParaFromBody(
      "**De:**\n\n```js\nold()\n```\n\n**Para:**\n\n```js\nnew()\n```\n"
    );
    assert.match(de, /old\(\)/);
    assert.match(para, /new\(\)/);
  });

  it("snippet_in_file", () => {
    const content = "function a() {\n  return 1\n}\n";
    assert.equal(snippetInFile(content, "return 1"), true);
    assert.equal(snippetInFile(content, "return 2"), false);
  });

  it("human reject", () => {
    const d = classifyThread(
      thread(MARKER + "Issue\n", { humanBody: "false positive, ignore" }),
      true,
      "m",
      "b",
      "h",
      ".",
      10,
      { now: "2026-08-10T00:00:00Z" }
    );
    assert.ok(d);
    assert.equal(d!.decision, "rejeitado");
    assert.equal(d!.finding_id, "test-finding");
  });

  it("human nao-aplicavel", () => {
    const d = classifyThread(
      thread(MARKER + "Edge\n", {
        humanBody: "só preview, fora do escopo",
      }),
      true,
      "m",
      "b",
      "h",
      ".",
      11,
      { now: "2026-08-10T00:00:00Z" }
    );
    assert.ok(d);
    assert.equal(d!.decision, "nao-aplicavel");
  });

  it("human accept no objection", () => {
    const d = classifyThread(
      thread(MARKER + "Validar\n", { humanBody: "faz sentido" }),
      true,
      "m",
      "b",
      "h",
      ".",
      12,
      { now: "2026-08-10T00:00:00Z" }
    );
    assert.ok(d);
    assert.equal(d!.decision, "aceito");
  });

  it("bot reply ignored as human", () => {
    const d = classifyThread(
      thread(MARKER + "Still there\n", {
        humanBody: "ok",
        humanLogin: "github-actions[bot]",
      }),
      true,
      "m",
      "b",
      "h",
      ".",
      13,
      {
        now: "2026-08-10T00:00:00Z",
        showFile: () => "Still there\n",
        listCommits: () => [],
      }
    );
    assert.ok(d);
    assert.equal(d!.decision, "rejeitado");
  });

  it("merge no reply rejected", () => {
    const d = classifyThread(
      thread(MARKER + "Achado ignorado\n"),
      true,
      "m",
      "b",
      "h",
      ".",
      14,
      {
        now: "2026-08-10T00:00:00Z",
        showFile: () => "Achado ignorado\n",
        listCommits: () => [],
      }
    );
    assert.ok(d);
    assert.equal(d!.decision, "rejeitado");
    assert.match(String(d!.reason), /sem resposta/);
  });

  it("resolved without human accepted", () => {
    const d = classifyThread(
      thread(MARKER + "X\n", { resolved: true }),
      true,
      "m",
      "b",
      "h",
      ".",
      15,
      {
        now: "2026-08-10T00:00:00Z",
        showFile: () => "",
        listCommits: () => [],
      }
    );
    assert.ok(d);
    assert.equal(d!.decision, "aceito");
  });

  it("bot root without marker ignored", () => {
    const d = classifyThread(
      thread("noise without marker\n", { resolved: true }),
      true,
      "m",
      "b",
      "h",
      ".",
      20,
      { now: "2026-08-10T00:00:00Z" }
    );
    assert.equal(d, null);
  });

  it("human top-level with reply accepted", () => {
    const d = classifyThread(
      thread("Prefira Heroicons em vez de SVG inline\n", {
        rootLogin: "lucas-hdbr",
        humanBody: "feito",
        path: "src/Card.tsx",
        line: 42,
      }),
      true,
      "m",
      "b",
      "h",
      ".",
      69,
      { now: "2026-08-10T00:00:00Z" }
    );
    assert.ok(d);
    assert.equal(d!.decision, "aceito");
    assert.equal(d!.origin, "human-review");
    assert.equal(d!.category, "pr-ingest-human");
    assert.equal(d!.file, "src/Card.tsx");
    assert.equal(d!.line, 42);
    assert.match(String(d!.finding_id), /heroicons|svg|inline/i);
  });

  it("human top-level resolved without reply accepted", () => {
    const d = classifyThread(
      thread("Default de vídeo deveria ir em branco\n", {
        rootLogin: "lucas-hdbr",
        resolved: true,
        path: "src/defaults.ts",
        line: 10,
      }),
      true,
      "m",
      "b",
      "h",
      ".",
      69,
      {
        now: "2026-08-10T00:00:00Z",
        showFile: () => "",
        listCommits: () => [],
      }
    );
    assert.ok(d);
    assert.equal(d!.decision, "aceito");
    assert.equal(d!.origin, "human-review");
    assert.match(String(d!.reason), /review humano resolvido/);
  });

  it("human top-level reject reply", () => {
    const d = classifyThread(
      thread("Trocar biblioteca de ícones\n", {
        rootLogin: "lucas-hdbr",
        humanBody: "não precisa, intencional",
      }),
      true,
      "m",
      "b",
      "h",
      ".",
      69,
      { now: "2026-08-10T00:00:00Z" }
    );
    assert.ok(d);
    assert.equal(d!.decision, "rejeitado");
    assert.equal(d!.origin, "human-review");
  });

  it("fix intra-pr aceito", () => {
    const body =
      MARKER +
      "Use const\n\n**De:**\n\n```js\nlet x = 1\n```\n\n**Para:**\n\n```js\nconst x = 1\n```\n";
    const files: Record<string, string> = {
      m: "const x = 1\n",
      h: "const x = 1\n",
    };
    const show = (_p: string, sha: string) => files[sha] ?? "";

    const [applied, reason] = fixAppliedInPr(".", {
      baseOid: "b",
      headOid: "h",
      mergeOid: "m",
      filePath: "src/ok.mjs",
      line: 1,
      deCode: "let x = 1",
      paraCode: "const x = 1",
      body,
      showFile: show,
      listCommits: () => ["h"],
    });
    assert.equal(applied, true);
    assert.match(reason, /Para/);

    const d = classifyThread(thread(body), true, "m", "b", "h", ".", 16, {
      now: "2026-08-10T00:00:00Z",
      showFile: show,
      listCommits: () => ["h"],
    });
    assert.ok(d);
    assert.equal(d!.decision, "aceito");
  });

  it("re-ingest replaces same pr source", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ingest-"));
    const filePath = path.join(dir, "decisions-ingest.jsonl");
    writeFileSync(
      filePath,
      '{"source":"github-pr-7","summary":"old","finding_id":"old"}\n' +
        '{"source":"github-pr-1","summary":"keep me","finding_id":"keep-me"}\n',
      "utf8"
    );
    const added = upsertPrDecisions(filePath, 7, [
      {
        source: "github-pr-7",
        summary: "new finding",
        decision: "aceito",
      },
    ]);
    assert.equal(added.length, 1);
    const text = readFileSync(filePath, "utf8");
    assert.match(text, /github-pr-1/);
    assert.match(text, /new finding/);
    assert.doesNotMatch(text, /"summary": "old"/);
    assert.equal((text.match(/github-pr-7/g) ?? []).length, 1);
  });
});
