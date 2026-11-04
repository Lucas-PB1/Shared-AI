import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseEnvValue, readRootFromEnvFile } from '../packages/cursor/scripts/mjs/routing-log.mjs';

const ROOT = join(import.meta.dirname, '..');
const WRAPPER = join(ROOT, 'packages/cursor/scripts/mjs/routing-log.mjs');

describe('routing-log wrapper', () => {
  it('parseEnvValue entende os formatos do bash (%q) e do PowerShell', () => {
    assert.equal(parseEnvValue('/home/u/my\\ repo'), '/home/u/my repo');
    assert.equal(parseEnvValue('"/home/u/repo"'), '/home/u/repo');
    assert.equal(parseEnvValue('C:\\Users\\u\\shared-ai'), 'C:\\Users\\u\\shared-ai');
  });

  it('roda de fora do clone resolvendo SHARED_AI_ROOT via shared-ai.env', () => {
    const dir = mkdtempSync(join(tmpdir(), 'shared-ai-wrapper-'));
    try {
      const cursorDir = join(dir, '.cursor');
      mkdirSync(cursorDir);
      writeFileSync(join(cursorDir, 'shared-ai.env'), `\uFEFFSHARED_AI_ROOT=${ROOT}\n`);
      assert.equal(readRootFromEnvFile(join(cursorDir, 'shared-ai.env')), ROOT);

      const log = join(dir, 'log.jsonl');
      const env = { ...process.env, CURSOR_USER_DIR: cursorDir, SHARED_AI_ROUTING_LOG: log };
      delete env.SHARED_AI_ROOT;
      const result = spawnSync(
        process.execPath,
        [WRAPPER, 'append', '--source=agent', '--skills=react', '--ask=teste', '--project=/x'],
        { cwd: dir, env, encoding: 'utf8' },
      );
      assert.equal(result.status, 0, result.stderr);
      const row = JSON.parse(readFileSync(log, 'utf8').trim());
      assert.deepEqual(row.skills, ['react']);
      assert.equal(row.project, '/x');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('falha com mensagem clara quando o clone não é encontrado', () => {
    const dir = mkdtempSync(join(tmpdir(), 'shared-ai-wrapper-'));
    try {
      const env = { ...process.env, CURSOR_USER_DIR: dir };
      delete env.SHARED_AI_ROOT;
      const result = spawnSync(process.execPath, [WRAPPER, 'append', '--skills=x'], {
        env,
        encoding: 'utf8',
      });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /SHARED_AI_ROOT/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
