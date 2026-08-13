import { createClient } from '@/shared/lib/supabase/server';

import type { Profile } from '@/entities/project';

const PROFILE_SELECT =
  'id, display_name, email, created_at, is_admin, avatar_url';

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('getCurrentProfile', error.message);
    return {
      id: user.id,
      display_name:
        (user.user_metadata?.display_name as string | undefined) ?? null,
      email: user.email ?? null,
      created_at: user.created_at,
      is_admin: false,
      avatar_url:
        (user.user_metadata?.avatar_url as string | undefined) ?? null,
    };
  }

  if (data) return data as Profile;

  return {
    id: user.id,
    display_name:
      (user.user_metadata?.display_name as string | undefined) ?? null,
    email: user.email ?? null,
    created_at: user.created_at,
    is_admin: false,
    avatar_url: null,
  };
}

export async function requireAppAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) {
    throw new Error('Apenas admin pode executar esta ação');
  }
  return profile;
}

export async function updateDisplayName(displayName: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.id);

  if (error) throw error;

  await supabase.auth.updateUser({
    data: { display_name: displayName },
  });
}

export async function updateAvatarUrl(avatarUrl: string | null): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id);

  if (error) throw error;

  await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });
}

export async function uploadAvatar(file: File): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('not authenticated');

  const allowed = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);
  if (!allowed.has(file.type)) {
    throw new Error('Use JPEG, PNG, WebP ou GIF');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Imagem no máximo 2 MB');
  }

  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/gif'
          ? 'gif'
          : 'jpg';
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  await updateAvatarUrl(url);
  return url;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) throw new Error('not authenticated');

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) {
    throw new Error('Senha atual incorreta');
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
