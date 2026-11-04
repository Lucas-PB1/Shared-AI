import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  appendRoutingLog,
  readRoutingLog,
  readRoutingLogForProject,
  sameProjectPath,
  summarizeRoutingLog,
} from '../packages/cursor/scripts/lib/routing/append-routing-log.js';
import { tempDir } from './helpers/tmp.js';

describe('routing log', () => {
  it('sameProjectPath ignora caixa, barra final e separador do Windows', () => {
    assert.equal(sameProjectPath('C:\\Repos\\App\\', 'c:/repos/app'), true);
    assert.equal(sameProjectPath('/a/b', '/a/c'), false);
    assert.equal(sameProjectPath(null, '/a'), false);
  });

  it('append + leitura filtrada por projeto + resumo', () => {
    process.env.SHARED_AI_ROUTING_LOG = join(tempDir(), 'routing-log.jsonl');
    const ts = new Date().toISOString();
    appendRoutingLog({ ts, project: '/p/app', ask: 'a', skills: ['react', 'next'], source: 'agent' });
    appendRoutingLog({ ts, project: '/p/outro', ask: 'b', skills: ['react'], source: 'manual' });

    assert.equal(readRoutingLog().length, 2);
    const forApp = readRoutingLogForProject('/P/App/');
    assert.equal(forApp.length, 1);
    assert.deepEqual(forApp[0]!.skills, ['react', 'next']);

    const summary = summarizeRoutingLog();
    assert.equal(summary.entries, 2);
    assert.equal(summary.skillCounts.react, 2);
    assert.equal(summary.bySource.agent, 1);
    delete process.env.SHARED_AI_ROUTING_LOG;
  });
});
