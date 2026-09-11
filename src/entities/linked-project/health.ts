import { homedir } from 'node:os';
import { join } from 'node:path';

import { collectHealth } from '../../../packages/cursor/scripts/lib/install/ts/health-json';
import { defaultRegistryPath } from '../../../packages/cursor/scripts/lib/install/ts/projects-registry';

import type { HealthResult, ProjectReport } from './health-types';
import { countSetupAttention } from './present-health';

function defaultEnvPath(): string {
  return join(homedir(), '.cursor', 'shared-ai.env');
}

export function getRegistryHealth(): HealthResult {
  return collectHealth(defaultEnvPath(), defaultRegistryPath());
}

export function healthByPath(
  health: HealthResult,
): Map<string, ProjectReport> {
  const map = new Map<string, ProjectReport>();
  for (const report of health.projects) {
    map.set(report.path.replace(/\\/g, '/').toLowerCase(), report);
  }
  return map;
}

export function findProjectHealth(
  health: HealthResult,
  projectPath: string,
): ProjectReport | undefined {
  const key = projectPath.replace(/\\/g, '/').toLowerCase();
  return healthByPath(health).get(key);
}

export { countSetupAttention };
export type {
  HealthResult,
  MachineReport,
  ProjectHealthView,
  ProjectReport,
} from './health-types';
