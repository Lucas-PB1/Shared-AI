import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  loadRegistry,
  pruneRegistry,
  unregisterProject,
} from '../packages/cursor/scripts/lib/install/ts/projects-registry.js';
import { tempDir } from './helpers/tmp.js';

const ROOT = join(import.meta.dirname, '..');
const CLI = join(ROOT, 'packages/cursor/scripts/lib/install/ts/projects-registry.ts');
const TSX = join(ROOT, 'node_modules/tsx/dist/cli.mjs');

function cli(...args: string[]) {
  return spawnSync(process.execPath, [TSX, CLI, ...args], { encoding: 'utf8' });
}

describe('projects-registry', () => {
  it('loadRegistry cria arquivo vazio e tolera JSON inválido', () => {
    const dir = tempDir();
    const reg = join(dir, 'nested', 'projects.json');
    assert.deepEqual(loadRegistry(reg), { projects: [] });
    writeFileSync(reg, '{ quebrado');
    assert.deepEqual(loadRegistry(reg), { projects: [] });
  });

  it('register é idempotente e atualiza lastLinked', () => {
    const dir = tempDir();
    const reg = join(dir, 'projects.json');
    const project = join(dir, 'app');
    mkdirSync(project);
    assert.equal(cli('register', project, reg).status, 0);
    assert.equal(cli('register', project, reg).status, 0);
    const data = loadRegistry(reg);
    assert.equal(data.projects.length, 1);
    assert.ok(data.projects[0]!.firstLinked <= data.projects[0]!.lastLinked);
  });

  it('unregister remove só o projeto pedido', () => {
    const dir = tempDir();
    const reg = join(dir, 'projects.json');
    const a = join(dir, 'a');
    const b = join(dir, 'b');
    mkdirSync(a);
    mkdirSync(b);
    cli('register', a, reg);
    cli('register', b, reg);
    assert.equal(unregisterProject(a, reg), true);
    assert.equal(unregisterProject(a, reg), false);
    assert.deepEqual(
      loadRegistry(reg).projects.map((p) => p.path),
      [realpathSync(b)],
    );
  });

  it('prune remove caminhos que não existem mais', () => {
    const dir = tempDir();
    const reg = join(dir, 'projects.json');
    const now = new Date().toISOString();
    writeFileSync(
      reg,
      JSON.stringify({
        projects: [
          { path: join(dir, 'sumiu'), firstLinked: now, lastLinked: now },
          { path: '', firstLinked: now, lastLinked: now },
        ],
      }),
    );
    pruneRegistry(reg);
    assert.deepEqual(loadRegistry(reg).projects, []);
  });
});
