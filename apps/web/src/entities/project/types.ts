export type Project = {
  id: string;
  slug: string;
  name: string;
  github_owner: string | null;
  github_repo: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MemberRole = 'owner' | 'member' | 'viewer';

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
  started_at: string;
  finished_at: string | null;
};

export type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
};
