import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { mergeHooks } from '../packages/cursor/scripts/lib/install/ts/merge-hooks-json.js';
import { tempDir } from './helpers/tmp.js';

type Hooks = { version?: number; hooks: Record<string, { command: string }[]> };

const isWin = process.platform === 'win32';
const read = (p: string) => JSON.parse(readFileSync(p, 'utf-8')) as Hooks;

describe('mergeHooks', () => {
  it('preserva hooks de terceiros e adiciona os do shared-ai', () => {
    const dir = tempDir();
    const file = join(dir, 'hooks.json');
    writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        hooks: {
          sessionStart: [{ command: './hooks/meu-hook.sh' }],
          afterFileEdit: [{ command: './hooks/format.sh' }],
        },
      }),
    );
    assert.equal(mergeHooks(file, null), 'merged');
    const data = read(file);
    const session = data.hooks.sessionStart!.map((h) => h.command);
    assert.ok(session.includes('./hooks/meu-hook.sh'));
    assert.ok(session.some((c) => c.includes('ensure-project-cursor')));
    assert.ok(data.hooks.stop!.some((h) => h.command.includes('routing-log-stop')));
    assert.deepEqual(data.hooks.afterFileEdit, [{ command: './hooks/format.sh' }]);
  });

  it('é idempotente (não duplica entradas)', () => {
    const dir = tempDir();
    const file = join(dir, 'hooks.json');
    mergeHooks(file, null);
    const first = readFileSync(file, 'utf-8');
    assert.equal(mergeHooks(file, null), 'ok');
    assert.equal(readFileSync(file, 'utf-8'), first);
    const data = read(file);
    assert.equal(data.hooks.sessionStart!.length, 1);
    assert.equal(data.hooks.stop!.length, 1);
  });

  it('troca a entrada do shared-ai do SO errado pela do SO atual', () => {
    const dir = tempDir();
    const file = join(dir, 'hooks.json');
    const wrong = isWin
      ? './hooks/ensure-project-cursor.sh'
      : 'powershell -NoProfile -ExecutionPolicy Bypass -File ./hooks/ensure-project-cursor.ps1';
    writeFileSync(file, JSON.stringify({ version: 1, hooks: { sessionStart: [{ command: wrong }] } }));
    mergeHooks(file, null);
    const session = read(file).hooks.sessionStart!.map((h) => h.command);
    assert.equal(session.length, 1);
    assert.notEqual(session[0], wrong);
    assert.ok(session[0]!.endsWith(isWin ? '.ps1' : '.sh'));
  });
});
