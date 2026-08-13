import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeDashboardMetrics } from '../src/features/dashboard/model/aggregate';

describe('dashboard aggregate from MVs', () => {
  it('sums Geral and filters by project', () => {
    const projects = [
      { id: 'p1', slug: 'a', name: 'A' },
      { id: 'p2', slug: 'b', name: 'B' },
    ];
    const projectStats = [
      {
        project_id: 'p1',
        runs: 1,
        completed: 1,
        failed: 0,
        decisions: 2,
        aceitos: 1,
        rejeitados: 1,
        nao_aplicavel: 0,
        acceptance_rate: 50,
      },
      {
        project_id: 'p2',
        runs: 1,
        completed: 0,
        failed: 1,
        decisions: 1,
        aceitos: 1,
        rejeitados: 0,
        nao_aplicavel: 0,
        acceptance_rate: 100,
      },
    ];
    const weekly = [
      {
        project_id: 'p1',
        week_start: '2026-07-27',
        runs: 1,
        aceitos: 1,
        rejeitados: 1,
      },
      {
        project_id: 'p2',
        week_start: '2026-08-03',
        runs: 1,
        aceitos: 1,
        rejeitados: 0,
      },
    ];

    const all = computeDashboardMetrics(
      projects,
      projectStats,
      weekly,
      'all',
    );
    assert.equal(all.runs, 2);
    assert.equal(all.aceitos, 2);
    assert.equal(all.rejeitados, 1);
    assert.equal(all.acceptanceRate, 66.7);
    assert.equal(all.byProject.length, 2);
    assert.equal(all.byWeek.length, 2);
    assert.equal(all.bySource[0]?.name, 'ci');

    const one = computeDashboardMetrics(
      projects,
      projectStats,
      weekly,
      'p1',
    );
    assert.equal(one.runs, 1);
    assert.equal(one.aceitos, 1);
    assert.equal(one.rejeitados, 1);
    assert.equal(one.acceptanceRate, 50);
    assert.equal(one.byProject.length, 1);
    assert.equal(one.byProject[0]?.slug, 'a');
    assert.equal(one.byWeek.length, 1);
  });
});
