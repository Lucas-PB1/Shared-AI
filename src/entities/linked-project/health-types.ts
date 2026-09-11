/** Tipos de saúde — sem I/O Node (seguro no client). */

export type MachineReport = {
  ok: boolean;
  version_clone: string | null;
  version_installed: string | null;
  issues: string[];
};

export type ProjectReport = {
  path: string;
  ok: boolean;
  issues: string[];
  profile: string;
  git_dirty: number;
  suggested_profile?: string;
};

export type HealthResult = {
  machine: MachineReport;
  projects: ProjectReport[];
  summary: { project_count: number; issues: number };
};

export type ProjectHealthView = {
  setupOk: boolean;
  statusLabel: string;
  setupMessages: string[];
  dirtyCount: number;
  dirtyLabel: string;
};
