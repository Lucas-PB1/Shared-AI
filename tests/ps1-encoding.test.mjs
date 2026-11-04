import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

/**
 * Windows PowerShell 5.1 lê .ps1 sem BOM como ANSI: "—" vira "â€”" e o último
 * byte (0x94) é tratado como aspas — pode quebrar o parse. Não-ASCII exige BOM.
 */
describe('.ps1 encoding', () => {
  it('todo .ps1 com caractere não-ASCII tem BOM UTF-8', () => {
    const files = spawnSync('git', ['-C', ROOT, 'ls-files', '*.ps1'], { encoding: 'utf8' })
      .stdout.split(/\r?\n/)
      .filter(Boolean);
    assert.ok(files.length > 0);
    const offenders = files.filter((file) => {
      const buf = readFileSync(join(ROOT, file));
      const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
      return !hasBom && buf.some((byte) => byte > 0x7f);
    });
    assert.deepEqual(offenders, [], `Salve como UTF-8 com BOM: ${offenders.join(', ')}`);
  });
});
