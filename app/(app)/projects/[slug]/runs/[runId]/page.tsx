import { notFound, redirect } from 'next/navigation';

import { getProjectBySlug, getProjectRun } from '@/entities/project';

type PageProps = {
  params: Promise<{ slug: string; runId: string }>;
};

/** Deep links antigos → página do projeto (artefatos abrem em modal). */
export default async function RunDetailPage({ params }: PageProps) {
  const { slug, runId } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const run = await getProjectRun(project.id, runId);
  if (!run) notFound();

  redirect(`/projects/${project.slug}`);
}
