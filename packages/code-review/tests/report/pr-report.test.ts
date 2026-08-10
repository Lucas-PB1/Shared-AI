/**
 * Unit tests fatia report (veredito, resumo, markers).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  VERDICT_NEEDS_CHANGES,
  VERDICT_NOT_RECOMMENDED,
  VERDICT_OK,
  buildInlineCommentBody,
  buildInlineMarker,
  codeSnippetsMatch,
  extractBlockTitle,
  extractPtSummary,
  fileRowPriority,
  formatSummaryTable,
  inlineBlockScore,
  normalizeCodeSnippet,
  parseVerdict,
  reportHasImpeditivo,
  verdictIsFailure,
} from "../../src/report/index.js";

const SAMPLE_BLOCK = `#### src/Foo.tsx:12 — Null check missing

**Em português:**
> Falta validar nulo antes de acessar.

**De:**

\`\`\`ts
x.y
\`\`\`

**Para:**

\`\`\`ts
x?.y
\`\`\`
`;

describe("verdict", () => {
  it("ok", () => {
    assert.equal(
      parseVerdict("**Stack:** TS\n\n**Veredito:** OK\n"),
      VERDICT_OK
    );
  });

  it("nao recomendado", () => {
    assert.equal(
      parseVerdict("**Veredito:** Não recomendado\n"),
      VERDICT_NOT_RECOMMENDED
    );
  });

  it("ajustes", () => {
    assert.equal(
      parseVerdict("**Veredito:** Ajustes necessários\n"),
      VERDICT_NEEDS_CHANGES
    );
  });

  it("default ajustes", () => {
    assert.equal(parseVerdict("sem veredito"), VERDICT_NEEDS_CHANGES);
  });

  it("failure flag", () => {
    assert.equal(verdictIsFailure(VERDICT_OK), false);
    assert.equal(verdictIsFailure(VERDICT_NEEDS_CHANGES), true);
  });

  it("impeditivo section", () => {
    assert.equal(reportHasImpeditivo("### Impeditivo\n- crash\n"), true);
    assert.equal(
      reportHasImpeditivo("**Veredito:** Não recomendado\n"),
      true
    );
    assert.equal(reportHasImpeditivo("**Veredito:** OK\n"), false);
  });
});

describe("priority", () => {
  it("priority order", () => {
    assert.equal(fileRowPriority("skip", "—", 0, 0)[0], 4);
    assert.equal(fileRowPriority("review", "OK", 0, 1)[0], 1);
    assert.equal(fileRowPriority("review", "OK", 2, 0)[0], 2);
    assert.equal(fileRowPriority("review", "Ajustes necessários", 0, 0)[0], 2);
    assert.equal(fileRowPriority("review", "OK", 0, 0)[0], 3);
  });

  it("format table sorted by priority", () => {
    const log = [
      "skip\ta.ts\t—\t0\t0",
      "review\tb.ts\tOK\t0\t0",
      "review\tc.ts\tAjustes necessários\t1\t0",
      "review\td.ts\tNão recomendado\t0\t2",
    ].join("\n");
    const [table, stats] = formatSummaryTable(log);
    const lines = table.split("\n").filter((ln) => ln.startsWith("|"));
    assert.equal(lines.length, 4);
    assert.match(lines[0], /d\.ts/);
    assert.match(lines[0], /impeditivo/);
    assert.match(lines[1], /c\.ts/);
    assert.match(lines[2], /b\.ts/);
    assert.match(lines[3], /a\.ts/);
    assert.equal(stats.reviewed, 3);
    assert.equal(stats.skipped, 1);
    assert.equal(stats.failed, 2);
    assert.equal(stats.blocking_this_run, 2);
    assert.equal(stats.inline_this_run, 1);
  });
});

describe("block helpers", () => {
  it("title and pt", () => {
    assert.equal(
      extractBlockTitle(SAMPLE_BLOCK),
      "src/Foo.tsx:12 — Null check missing"
    );
    assert.match(extractPtSummary(SAMPLE_BLOCK).toLowerCase(), /validar nulo/);
  });

  it("inline marker uses stable id", () => {
    const m = buildInlineMarker(
      "src/Foo.tsx",
      12,
      "src/Foo.tsx:12 — Null check missing"
    );
    assert.match(m, /avaliar-inline:src\/Foo\.tsx:12:fid:/);
    assert.match(m, /null-check-missing/);
  });

  it("snippet normalize match", () => {
    const a = "  foo()\n\n  bar()  ";
    const b = "foo()\nbar()";
    assert.equal(normalizeCodeSnippet(a), "foo()\nbar()");
    assert.equal(codeSnippetsMatch(a, b), true);
    assert.equal(codeSnippetsMatch("a", "b"), false);
  });

  it("block score", () => {
    assert.equal(inlineBlockScore("#### x\n"), 0);
    assert.equal(inlineBlockScore("**De:**\n**Para:**\n"), 5);
  });

  it("inline comment body", () => {
    const body = buildInlineCommentBody(SAMPLE_BLOCK);
    assert.match(body, /Null check/);
    assert.match(body.toLowerCase(), /nulo/);
  });
});
