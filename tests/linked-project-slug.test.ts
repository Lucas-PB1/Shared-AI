import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { slugFromPath } from '../src/entities/linked-project/slug.js';

describe('slugFromPath', () => {
  it('uses basename and a stable hash', () => {
    const slug = slugFromPath('D:/Projetos/meu-app');
    assert.match(slug, /^meu-app-[a-f0-9]{8}$/);
    assert.equal(slug, slugFromPath('D:/Projetos/meu-app'));
  });

  it('differs for two folders with the same name', () => {
    const a = slugFromPath('/tmp/app');
    const b = slugFromPath('/var/app');
    assert.notEqual(a, b);
    assert.match(a, /^app-/);
    assert.match(b, /^app-/);
  });
});
