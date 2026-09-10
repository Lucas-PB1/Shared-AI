export type LinkedProject = {
  slug: string;
  name: string;
  path: string;
  firstLinked: string;
  lastLinked: string;
  pathExists: boolean;
  gitRemote: string | null;
  profile: string | null;
};

export type LinkedProjectSummary = {
  total: number;
  missing: number;
  lastLinked: string | null;
};
