'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { updateDisplayName } from '@/entities/profile';

const schema = z.object({
  display_name: z.string().min(2, 'Nome com no mínimo 2 caracteres'),
});

export type AccountActionState = {
  error?: string;
  success?: string;
};

export async function saveAccount(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const parsed = schema.safeParse({
    display_name: formData.get('display_name'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  try {
    await updateDisplayName(parsed.data.display_name);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Falha ao salvar',
    };
  }

  revalidatePath('/account');
  return { success: 'Perfil atualizado' };
}
