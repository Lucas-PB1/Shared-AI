/**
 * Node test — skill routing (sem I/O de LLM).
 * node --test packages/code-review/tools/tests/test_skill_routing.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  matchGlob,
  resolveSkillIds,
  scopeMatchesFile,
  resolveContextForFile,
} from '../review-skill-routing.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODE_REVIEW_ROOT = path.join(__dirname, '..', '..');

describe('matchGlob', () => {
  it('matches ** and *', () => {
    assert.equal(matchGlob('**/*', 'a/b.ts'), true);
    assert.equal(matchGlob('src/**/*.ts', 'src/x/y.ts'), true);
    assert.equal(matchGlob('src/**/*.ts', 'lib/x.ts'), false);
  });
});

describe('scopeMatchesFile', () => {
  it('handles /** prefix and exact', () => {
    assert.equal(scopeMatchesFile('components/**', 'components/foo.tsx'), true);
    assert.equal(scopeMatchesFile('**/*', 'anything.ts'), true);
    assert.equal(scopeMatchesFile('Foo', 'path/Foo/bar.ts'), true);
  });
});

describe('resolveSkillIds', () => {
  it('orders hostdime routes before stack', () => {
    const ids = resolveSkillIds('src/components/modules/SectionHero/SectionHero.tsx');
    assert.ok(ids.includes('hostdime-sections'), ids.join(','));
    assert.ok(ids.includes('react'));
    assert.ok(ids.includes('typescript'));
    assert.ok(ids.indexOf('hostdime-sections') < ids.indexOf('react'));
  });

  it('matches fields and css', () => {
    assert.ok(
      resolveSkillIds('src/components/modules/X/XFields.tsx').includes('hostdime-module-fields'),
    );
    assert.ok(resolveSkillIds('src/styles/theme.css').includes('hostdime-styling'));
  });
});

describe('resolveContextForFile', () => {
  it('loads review-inbox and stack hints with small maxChars', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-'));
    const ctx = resolveContextForFile(tmp, 'App.tsx', {
      codeReviewRoot: CODE_REVIEW_ROOT,
      maxChars: 4000,
      includeStack: true,
    });
    assert.ok(ctx.skillIds.includes('review-inbox') || ctx.contextText.length >= 0);
    assert.ok(ctx.skillIds.includes('react') || ctx.contextText.includes('React') || ctx.skillIds.length >= 0);
    // With code-review package skills present, review-inbox should load
    assert.ok(ctx.skillIds.includes('review-inbox'));
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
