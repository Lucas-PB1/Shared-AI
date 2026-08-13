'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createClient } from '@/shared/lib/supabase/server';

const claimSchema = z.object({
  projectId: z.string().uuid(),
});

export type ClaimActionState = {
  error?: string;
  success?: string;
};

export async function claimProjectOwner(
  _prev: ClaimActionState,
  formData: FormData,
): Promise<ClaimActionState> {
  const parsed = claimSchema.safeParse({
    projectId: formData.get('projectId'),
  });

  if (!parsed.success) {
    return { error: 'Projeto inválido' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('claim_project_owner', {
    p_project_id: parsed.data.projectId,
  });

  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/projects');
  return { success: 'Você é o owner deste projeto' };
}
