/**
 * Node test — helpers puros do review-llm (sem API).
 * node --test packages/code-review/tools/tests/test_llm_helpers.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseArgs,
  inferStack,
  buildUserPrompt,
  parseVerdict,
} from '../review-llm.mjs';

describe('parseArgs', () => {
  it('parses long flags', () => {
    const args = parseArgs([
      'node',
      'review-llm.mjs',
      '--project',
      '/repo',
      '--file',
      'src/a.ts',
      '--static-file',
      '/tmp/s',
    ]);
    assert.equal(args.project, '/repo');
    assert.equal(args.file, 'src/a.ts');
    assert.equal(args.staticFile, '/tmp/s');
  });
});

describe('inferStack', () => {
  it('maps extensions', () => {
    assert.equal(inferStack('a.tsx'), 'TypeScript / React');
    assert.equal(inferStack('a.php'), 'PHP');
    assert.equal(inferStack('a.mjs'), 'JavaScript');
  });
});

describe('parseVerdict', () => {
  it('reads veredito line', () => {
    assert.equal(parseVerdict('**Veredito:** OK\n'), 'OK');
    assert.equal(parseVerdict('**Veredito:** Não recomendado\n'), 'Não recomendado');
    assert.equal(parseVerdict('sem'), 'Ajustes necessários');
  });
});

describe('buildUserPrompt', () => {
  it('includes file skills and exclusions sections', () => {
    const text = buildUserPrompt({
      relFile: 'src/a.ts',
      stack: 'TypeScript',
      source: 'const x = 1',
      diff: '+const x = 1',
      staticOut: '',
      convencoes: '- Use strict',
      exclusions: '- [rejeitado] accepted-pattern',
      skillsContext: 'skill text',
      skillIds: ['typescript'],
      ruleIds: [],
    });
    assert.ok(text.includes('File: src/a.ts'));
    assert.ok(text.includes('Skills: typescript'));
    assert.ok(text.includes('skill text'));
    assert.ok(text.includes('accepted-pattern'));
    assert.ok(text.includes('const x = 1'));
  });
});
