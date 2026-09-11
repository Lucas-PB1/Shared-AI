import {
  defaultRoutingLogPath,
  readRoutingLogForProject,
  type RoutingLogEntry,
} from '../../../packages/cursor/scripts/lib/routing/append-routing-log';

export type { RoutingLogEntry };

export function routingLogFilePath(): string {
  return defaultRoutingLogPath();
}

export function listProjectRoutingLog(
  projectPath: string,
  days = 30,
): RoutingLogEntry[] {
  return readRoutingLogForProject(projectPath, days);
}
