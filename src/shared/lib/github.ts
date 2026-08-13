import type { Project } from '@/entities/project';

/** URL do PR no GitHub — funciona aberto, mergeado ou fechado. */
export function githubPullRequestUrl(
  project: Pick<Project, 'github_owner' | 'github_repo'>,
  prNumber: number | null | undefined,
): string | null {
  if (!project.github_owner || !project.github_repo || !prNumber) return null;
  return `https://github.com/${project.github_owner}/${project.github_repo}/pull/${prNumber}`;
}
