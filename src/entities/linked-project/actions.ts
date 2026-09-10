'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getLinkedProjectBySlug, unregisterLinkedProject } from './api';

export async function unregisterLinkedProjectAction(
  formData: FormData,
): Promise<void> {
  const slug = String(formData.get('slug') ?? '');
  const project = getLinkedProjectBySlug(slug);
  if (!project) {
    redirect('/projects');
  }
  unregisterLinkedProject(project.path);
  revalidatePath('/');
  revalidatePath('/projects');
  redirect('/projects');
}
