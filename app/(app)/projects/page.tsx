import {
  getRegistryHealth,
  LinkedProjectsGrid,
  listLinkedProjects,
} from '@/entities/linked-project';

export default async function ProjectsPage() {
  const projects = listLinkedProjects();
  const health = getRegistryHealth();
  const healthByPath = Object.fromEntries(
    health.projects.map((report) => [
      report.path.replace(/\\/g, '/').toLowerCase(),
      report,
    ]),
  );

  return (
    <div className="space-y-10">
      <section className="sa-page-mesh overflow-hidden rounded-sa-2xl border border-sa-border bg-sa-canvas px-5 py-7 shadow-sa-md md:px-8 md:py-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sa-primary">
          Registry local
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Projetos
        </h1>
        <p className="mt-2 max-w-2xl text-sa-secondary md:text-base">
          Lista de repositórios em{' '}
          <code className="text-sa-ink">~/.cursor/shared-ai/projects.json</code>.
        </p>
        <p className="mt-4 text-sm font-medium text-sa-muted">
          {projects.length} projeto{projects.length === 1 ? '' : 's'} ·{' '}
          {health.summary.issues} aviso
          {health.summary.issues === 1 ? '' : 's'} de saúde
        </p>
      </section>

      <LinkedProjectsGrid projects={projects} healthByPath={healthByPath} />
    </div>
  );
}
