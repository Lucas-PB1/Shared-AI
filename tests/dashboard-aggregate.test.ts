import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeDashboardMetrics } from '../src/features/dashboard/model/aggregate';

describe('dashboard aggregate', () => {
  it('computes acceptance rate and filters by project', () => {
    const projects = [
      { id: 'p1', slug: 'a', name: 'A' },
      { id: 'p2', slug: 'b', name: 'B' },
    ];
    const runs = [
      {
        id: 'r1',
        project_id: 'p1',
        source: 'ci',
        status: 'completed',
        started_at: '2026-08-01T10:00:00Z',
        finished_at: null,
        pr_number: 1,
      },
      {
        id: 'r2',
        project_id: 'p2',
        source: 'local',
        status: 'failed',
        started_at: '2026-08-08T10:00:00Z',
        finished_at: null,
        pr_number: null,
      },
    ];
    const decisions = [
      {
        id: 'd1',
        project_id: 'p1',
        run_id: 'r1',
        verdict: 'aceito',
        finalized_at: '2026-08-01T12:00:00Z',
        decided_by: 'alice',
      },
      {
        id: 'd2',
        project_id: 'p1',
        run_id: 'r1',
        verdict: 'rejeitado',
        finalized_at: '2026-08-01T12:01:00Z',
        decided_by: 'bob',
      },
      {
        id: 'd3',
        project_id: 'p2',
        run_id: 'r2',
        verdict: 'aceito',
        finalized_at: '2026-08-08T12:00:00Z',
        decided_by: null,
      },
    ];

    const all = computeDashboardMetrics(projects, runs, decisions, 'all');
    assert.equal(all.runs, 2);
    assert.equal(all.aceitos, 2);
    assert.equal(all.rejeitados, 1);
    assert.equal(all.acceptanceRate, 66.7);
    assert.equal(all.byProject.length, 2);

    const one = computeDashboardMetrics(projects, runs, decisions, 'p1');
    assert.equal(one.runs, 1);
    assert.equal(one.aceitos, 1);
    assert.equal(one.rejeitados, 1);
    assert.equal(one.acceptanceRate, 50);
    assert.equal(one.byProject.length, 1);
    assert.equal(one.byProject[0].slug, 'a');
  });
});
