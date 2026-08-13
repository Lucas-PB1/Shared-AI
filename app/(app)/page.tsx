import {
  listMemberProjects,
  listUnclaimedProjects,
  ProjectCard,
} from '@/entities/project';
import { ClaimProjectButton } from '@/features/claim-project';
import { EmptyState } from '@/shared/ui/empty-state';

export default async function ProjectsPage() {
  const [projects, unclaimed] = await Promise.all([
    listMemberProjects(),
    listUnclaimedProjects(),
  ]);

  return (
    <div className="space-y-10">
      <section className="hd-page-mesh overflow-hidden rounded-hd-2xl border border-hd-border bg-hd-canvas px-5 py-7 shadow-hd-md md:px-8 md:py-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hd-primary">
          Review store
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Projetos
        </h1>
        <p className="mt-2 max-w-2xl text-hd-secondary md:text-base">
          Memória evolutiva e runs dos repositórios HostDime aos quais você
          pertence.
        </p>
        <p className="mt-4 text-sm font-medium text-hd-muted">
          {projects.length} projeto{projects.length === 1 ? '' : 's'} no seu
          acesso
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-hd-ink">Meus projetos</h2>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            title="Nenhum projeto ainda"
            description="Reivindique um projeto sem owner abaixo, ou peça um convite a um owner."
          />
        ) : (
          <ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id} className="h-full">
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {unclaimed.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-hd-ink">Disponíveis</h2>
            <p className="mt-1 text-sm text-hd-muted">
              Sem membros — reivindique para se tornar owner.
            </p>
          </div>
          <ul className="grid gap-3">
            {unclaimed.map((project) => (
              <li
                key={project.id}
                className="flex flex-col gap-3 rounded-hd-2xl border border-dashed border-hd-primary/30 bg-hd-primary-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-hd-ink">{project.name}</p>
                  <p className="font-mono text-xs text-hd-muted">{project.slug}</p>
                </div>
                <ClaimProjectButton
                  projectId={project.id}
                  projectName={project.name}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
