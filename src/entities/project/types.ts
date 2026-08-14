export type MemberRole = 'owner' | 'member' | 'viewer';

export type Project = {
  id: string;
  slug: string;
  name: string;
  github_owner: string | null;
  github_repo: string | null;
  created_at?: string;
  updated_at?: string;
};

/** Projeto na home, com contagem de review runs. */
export type ProjectListItem = Project & {
  runs_count: number;
};

export type ProjectMember = {
  project_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
  } | null;
};

export type ReviewRunMeta = {
  by_verdict?: Record<string, number>;
  conventions?: number;
  exclusions?: number;
  decisions_count?: number;
  findings_created?: number;
  files_count?: number;
  kind?: string;
  pr_author?: string | null;
  pr_author_is_bot?: boolean;
  reviewers?: string[];
  reviews?: Array<{ login: string; state: string; is_bot: boolean }>;
  [key: string]: unknown;
};

export type ReviewRun = {
  id: string;
  project_id: string;
  source: 'local' | 'ci' | 'pre_commit' | 'agent';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  actor_kind: string;
  actor_ref: string | null;
  git_sha: string | null;
  branch: string | null;
  pr_number: number | null;
  review_slug?: string | null;
  pr_author?: string | null;
  pr_author_is_bot?: boolean;
  reviewers?: string[];
  started_at: string;
  finished_at: string | null;
  meta?: ReviewRunMeta | null;
};

export type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  is_admin?: boolean;
  avatar_url?: string | null;
};

export type Finding = {
  id: string;
  run_id: string;
  finding_key: string;
  file_path: string | null;
  line_start: number | null;
  line_end: number | null;
  severity: string | null;
  category: string | null;
  summary: string;
  body: string | null;
};

export type DecisionComment = {
  login: string;
  is_bot: boolean;
  kind: 'bot' | 'human';
  role: 'root' | 'reply';
  body: string;
};

export type DecisionMeta = {
  root_author?: string | null;
  root_is_bot?: boolean | null;
  root_kind?: 'bot' | 'human' | null;
  comments?: DecisionComment[] | null;
  origin?: string | null;
  decided_by_login?: string | null;
  decided_by_kind?: 'human' | 'bot' | 'auto' | null;
  [key: string]: unknown;
};

export type Decision = {
  id: string;
  project_id: string;
  run_id: string | null;
  finding_id: string | null;
  finding_key: string;
  verdict: 'aceito' | 'rejeitado' | 'nao-aplicavel';
  reason: string | null;
  decided_by: string | null;
  source: string | null;
  file_path: string | null;
  summary: string | null;
  finalized_at: string;
  meta?: DecisionMeta | null;
};

export type Exclusion = {
  id: string;
  project_id: string;
  finding_key: string;
  reason: string;
  scope_glob: string;
  active: boolean;
  occurrences: number;
  source: string | null;
  updated_at: string;
};

export type ConventionMeta = {
  evidence_decision_ids?: string[];
  evidence_count?: number;
  absorbed_finding_keys?: string[];
  related_prs?: number[];
  llm_promoted?: boolean;
  superseded_by?: string;
  [key: string]: unknown;
};

export type Convention = {
  id: string;
  project_id: string;
  finding_key: string | null;
  scope_glob: string;
  body: string;
  source: string | null;
  occurrences: number;
  updated_at: string;
  meta?: ConventionMeta | null;
};
