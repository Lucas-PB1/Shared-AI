import { notFound } from 'next/navigation';

import {
  getMyRole,
  getProjectBySlug,
  listProjectAcceptedDecisions,
  listProjectConventions,
  listProjectExclusions,
  listProjectMembers,
  listProjectRuns,
} from '@/entities/project';
import { ProjectMemoryPanel, RunsTable } from '@/entities/review-run';
import { createClient } from '@/shared/lib/supabase/server';
import { ProjectHeader } from '@/widgets/project-header';
import { ProjectTeamPanel } from '@/widgets/project-team';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [members, runs, role, exclusions, conventions, accepted] =
    await Promise.all([
      listProjectMembers(project.id),
      listProjectRuns(project.id),
      user ? getMyRole(project.id, user.id) : Promise.resolve(null),
      listProjectExclusions(project.id),
      listProjectConventions(project.id),
      listProjectAcceptedDecisions(project.id),
    ]);

  const isOwner = role === 'owner';

  return (
    <div className="space-y-5">
      <ProjectHeader
        project={project}
        role={role}
        stats={{
          runs: runs.length,
          members: members.length,
          accepted: accepted.length,
          exclusions: exclusions.length,
        }}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="min-w-0 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-hd-ink">Review runs</h2>
            <p className="text-xs text-hd-muted">
              Clique numa linha para abrir Aceitos / Rejeitados
            </p>
          </div>
          <RunsTable runs={runs} project={project} />
        </section>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
          <ProjectMemoryPanel
            exclusions={exclusions}
            conventions={conventions}
            accepted={accepted}
          />
          <ProjectTeamPanel
            members={members}
            projectId={project.id}
            projectSlug={project.slug}
            isOwner={isOwner}
          />
        </aside>
      </div>
    </div>
  );
}
