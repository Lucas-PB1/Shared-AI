import type {
  HealthResult,
  ProjectHealthView,
  ProjectReport,
} from './health-types';

/** Issues de setup/link — working tree sujo não conta como “quebrado”. */
export function setupIssueCodes(report: ProjectReport): string[] {
  return report.issues.filter((issue) => !issue.startsWith('git_dirty'));
}

export function formatHealthIssue(issue: string): string {
  if (issue === 'missing') return 'Pasta do projeto não encontrada neste computador';
  if (issue === 'no_git') return 'Pasta sem repositório git';
  if (issue === 'missing_profile') {
    return 'Sem perfil de bootstrap (rode npm run bootstrap neste repo)';
  }
  if (issue === 'version_mismatch') {
    return 'Versão do Shared AI desatualizada (git pull && npm run sync)';
  }
  if (issue === 'not_installed') return 'Shared AI ainda não instalado nesta máquina';

  const broken = /^broken_symlinks:(\d+)$/.exec(issue);
  if (broken) {
    const n = Number(broken[1]);
    return `${n} symlink${n === 1 ? '' : 's'} quebrado${n === 1 ? '' : 's'} em .cursor/rules`;
  }

  const dirty = /^git_dirty:(\d+)$/.exec(issue);
  if (dirty) {
    const n = Number(dirty[1]);
    return `${n} arquivo${n === 1 ? '' : 's'} alterado${n === 1 ? '' : 's'} sem commit`;
  }

  return issue;
}

export function formatGitDirty(count: number): string {
  if (count <= 0) return 'Working tree limpa (nada pendente de commit)';
  return `${count} arquivo${count === 1 ? '' : 's'} alterado${count === 1 ? '' : 's'} sem commit`;
}

export function presentProjectHealth(
  report: ProjectReport | undefined,
  pathExists: boolean,
): ProjectHealthView {
  if (!pathExists) {
    return {
      setupOk: false,
      statusLabel: 'Pasta ausente',
      setupMessages: ['Pasta do projeto não encontrada neste computador'],
      dirtyCount: 0,
      dirtyLabel: '—',
    };
  }
  if (!report) {
    return {
      setupOk: true,
      statusLabel: 'Sem dados',
      setupMessages: [],
      dirtyCount: 0,
      dirtyLabel: '—',
    };
  }

  const setup = setupIssueCodes(report);
  const setupOk = setup.length === 0;
  return {
    setupOk,
    statusLabel: setupOk ? 'Tudo certo' : 'Precisa de atenção',
    setupMessages: setup.map(formatHealthIssue),
    dirtyCount: report.git_dirty,
    dirtyLabel: formatGitDirty(report.git_dirty),
  };
}

export function countSetupAttention(health: HealthResult): number {
  return health.projects.filter((p) => setupIssueCodes(p).length > 0).length;
}
