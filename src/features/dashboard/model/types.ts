export type DashboardProject = {
  id: string;
  slug: string;
  name: string;
};

export type DashboardRun = {
  id: string;
  project_id: string;
  source: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  pr_number: number | null;
};

export type DashboardDecision = {
  id: string;
  project_id: string;
  run_id: string | null;
  verdict: string;
  finalized_at: string;
  decided_by: string | null;
};

export type DashboardSnapshot = {
  projects: DashboardProject[];
  runs: DashboardRun[];
  decisions: DashboardDecision[];
};

export type WeekPoint = {
  week: string;
  label: string;
  runs: number;
  aceitos: number;
  rejeitados: number;
};

export type ProjectPoint = {
  id: string;
  slug: string;
  name: string;
  runs: number;
  aceitos: number;
  rejeitados: number;
  decisions: number;
  /** 0–100; null se sem decisões aceito/rejeitado */
  acceptanceRate: number | null;
};

export type NamedCount = {
  name: string;
  count: number;
};

export type DashboardMetrics = {
  runs: number;
  completed: number;
  failed: number;
  decisions: number;
  aceitos: number;
  rejeitados: number;
  naoAplicavel: number;
  /** % aceito / (aceito + rejeitado) */
  acceptanceRate: number | null;
  byWeek: WeekPoint[];
  byProject: ProjectPoint[];
  bySource: NamedCount[];
  byStatus: NamedCount[];
  byVerdict: NamedCount[];
};
