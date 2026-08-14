export type DashboardProject = {
  id: string;
  slug: string;
  name: string;
};

/** Linha de mv_dashboard_project_stats (tabela com RLS por membership). */
export type DashboardProjectStat = {
  project_id: string;
  runs: number;
  completed: number;
  failed: number;
  decisions: number;
  aceitos: number;
  rejeitados: number;
  nao_aplicavel: number;
  acceptance_rate: number | null;
};

/** Linha de mv_dashboard_weekly. */
export type DashboardWeeklyStat = {
  project_id: string;
  week_start: string;
  runs: number;
  aceitos: number;
  rejeitados: number;
};

export type DashboardSnapshot = {
  projects: DashboardProject[];
  projectStats: DashboardProjectStat[];
  weekly: DashboardWeeklyStat[];
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
