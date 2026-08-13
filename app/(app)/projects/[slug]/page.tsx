import { notFound } from 'next/navigation';

import {
  getMyRole,
  getProjectBySlug,
  listProjectMembers,
  listProjectRuns,
} from '@/entities/project';
import { RunsTable } from '@/entities/review-run';
import { InviteMemberForm } from '@/features/invite-member';
import { createClient } from '@/shared/lib/supabase/server';
import { Badge } from '@/shared/ui/badge';
import { Card, CardTitle } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { ProjectHeader } from '@/widgets/project-header';

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

  const [members, runs, role] = await Promise.all([
    listProjectMembers(project.id),
    listProjectRuns(project.id),
    user ? getMyRole(project.id, user.id) : Promise.resolve(null),
  ]);

  const isOwner = role === 'owner';

  return (
    <div>
      <ProjectHeader project={project} role={role} />

      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-hd-ink">Membros</h2>
          {members.length === 0 ? (
            <EmptyState title="Sem membros" />
          ) : (
            <Card className="space-y-3 p-0">
              <ul className="divide-y divide-hd-border">
                {members.map((member) => (
                  <li
                    key={member.user_id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-hd-ink">
                        {member.profiles?.display_name ||
                          member.profiles?.email ||
                          member.user_id}
                      </p>
                      {member.profiles?.email ? (
                        <p className="truncate text-xs text-hd-muted">
                          {member.profiles.email}
                        </p>
                      ) : null}
                    </div>
                    <Badge>{member.role}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {isOwner ? (
            <div className="space-y-2">
              <CardTitle className="text-base">Convidar</CardTitle>
              <p className="text-sm text-hd-muted">
                A pessoa precisa ter criado conta antes (profile por e-mail).
              </p>
              <InviteMemberForm projectId={project.id} projectSlug={project.slug} />
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-hd-ink">Review runs</h2>
          <RunsTable runs={runs} />
        </section>
      </div>
    </div>
  );
}
