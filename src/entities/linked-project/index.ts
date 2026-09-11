export {
  getLinkedProjectBySlug,
  listLinkedProjects,
  summarizeLinkedProjects,
  unregisterLinkedProject,
} from './api';
export { unregisterLinkedProjectAction } from './actions';
export {
  findProjectHealth,
  getRegistryHealth,
  healthByPath,
  countSetupAttention,
} from './health';
export {
  presentProjectHealth,
  formatGitDirty,
  formatHealthIssue,
} from './present-health';
export type {
  HealthResult,
  MachineReport,
  ProjectHealthView,
  ProjectReport,
} from './health-types';
export { slugFromPath } from './slug';
export type { LinkedProject, LinkedProjectSummary } from './types';
export { LinkedProjectCard } from './ui/project-card';
export { LinkedProjectsGrid } from './ui/projects-grid';
