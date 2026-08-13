'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient } from '@/shared/lib/supabase/server';

const inviteSchema = z.object({
  projectId: z.string().uuid(),
  projectSlug: z.string().min(1),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['member', 'viewer']),
});

export type InviteActionState = {
  error?: string;
  success?: string;
};

export async function inviteMember(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const parsed = inviteSchema.safeParse({
    projectId: formData.get('projectId'),
    projectSlug: formData.get('projectSlug'),
    email: formData.get('email'),
    role: formData.get('role') || 'member',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('invite_project_member', {
    p_project_id: parsed.data.projectId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.projectSlug}`);
  return { success: `Convite enviado para ${parsed.data.email}` };
}
