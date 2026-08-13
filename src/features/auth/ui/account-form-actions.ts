'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  changePassword,
  updateDisplayName,
  uploadAvatar,
} from '@/entities/profile';

export type AccountActionState = {
  error?: string;
  success?: string;
};

const profileSchema = z.object({
  display_name: z.string().min(2, 'Nome com no mínimo 2 caracteres'),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Informe a senha atual'),
    new_password: z.string().min(8, 'Nova senha com no mínimo 8 caracteres'),
    confirm_password: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Confirmação não confere',
    path: ['confirm_password'],
  });

export async function saveAccount(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const parsed = profileSchema.safeParse({
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
  revalidatePath('/');
  return { success: 'Perfil atualizado' };
}

export async function saveAvatar(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Selecione uma imagem' };
  }

  try {
    await uploadAvatar(file);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Falha no upload',
    };
  }

  revalidatePath('/account');
  revalidatePath('/');
  return { success: 'Foto atualizada' };
}

export async function savePassword(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const parsed = passwordSchema.safeParse({
    current_password: formData.get('current_password'),
    new_password: formData.get('new_password'),
    confirm_password: formData.get('confirm_password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  try {
    await changePassword(
      parsed.data.current_password,
      parsed.data.new_password,
    );
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Falha ao trocar senha',
    };
  }

  return { success: 'Senha alterada' };
}
