import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  loadWatches,
  matchFiles,
  pathMatches,
  validateWatches,
} from '../packages/cursor/scripts/lib/history/history-watch-match.js';
import { tempDir } from './helpers/tmp.js';

describe('pathMatches', () => {
  it('file: só o caminho exato (normalizando ./ e \\)', () => {
    assert.equal(pathMatches('./src/a.ts', 'src/a.ts', 'file'), true);
    assert.equal(pathMatches('src\\a.ts', 'src/a.ts', 'file'), true);
    assert.equal(pathMatches('src/ab.ts', 'src/a.ts', 'file'), false);
  });

  it('dir: tudo abaixo do diretório, sem vazar para prefixos parecidos', () => {
    assert.equal(pathMatches('src/auth/login.ts', 'src/auth', 'dir'), true);
    assert.equal(pathMatches('src/auth/deep/x.ts', 'src/auth/', 'dir'), true);
    assert.equal(pathMatches('src/authz/x.ts', 'src/auth', 'dir'), false);
  });

  it('glob: ** e * com prefixo', () => {
    assert.equal(pathMatches('supabase/migrations/001.sql', 'supabase/**/*.sql', 'glob'), true);
    assert.equal(pathMatches('supabase/seed.ts', 'supabase/**/*.sql', 'glob'), false);
    assert.equal(pathMatches('docs/readme.md', '*.md', 'glob'), true);
  });
});

describe('validateWatches', () => {
  const ok = {
    id: 'auth',
    scope: 'src/auth',
    scopeKind: 'dir',
    historyFile: 'docs/auth.md',
    format: 'okf-log',
    enabled: true,
  };

  it('aceita watch válido', () => {
    assert.deepEqual(validateWatches({ watches: [ok] }), []);
  });

  it('acusa campos faltando, id duplicado e enums inválidos', () => {
    const errors = validateWatches({
      watches: [ok, { ...ok }, { ...ok, id: 'X!', scopeKind: 'regex', format: 'txt', enabled: 'sim' }, {}],
    });
    const text = errors.join('\n');
    assert.match(text, /id duplicado 'auth'/);
    assert.match(text, /id inválido 'X!'/);
    assert.match(text, /scopeKind inválido/);
    assert.match(text, /format inválido/);
    assert.match(text, /enabled deve ser boolean/);
    assert.match(text, /watches\[3\]: falta campo 'scope'/);
  });
});

describe('matchFiles / loadWatches', () => {
  it('ignora watches desabilitados e deduplica arquivos', () => {
    const dir = tempDir();
    const file = join(dir, 'watches.json');
    writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        watches: [
          { id: 'a', scope: 'src/a', scopeKind: 'dir', historyFile: 'h.md', format: 'markdown', enabled: true },
          { id: 'b', scope: 'src/a', scopeKind: 'dir', historyFile: 'h.md', format: 'markdown', enabled: false },
        ],
      }),
    );
    const res = matchFiles(file, ['src/a/x.ts', './src/a/x.ts', 'src/b/y.ts']);
    assert.equal(res.length, 1);
    assert.equal(res[0]!.id, 'a');
    assert.deepEqual(res[0]!.matchedFiles, ['src/a/x.ts']);
  });

  it('arquivo ausente = lista vazia; version errada = erro', () => {
    const dir = tempDir();
    assert.deepEqual(loadWatches(join(dir, 'nao-existe.json')).watches, []);
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, JSON.stringify({ version: 2, watches: [] }));
    assert.throws(() => loadWatches(bad), /version deve ser 1/);
  });
});
