import { createClient } from '@/shared/lib/supabase/server';

import type { Profile } from '@/entities/project';

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, email, created_at, is_admin')
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
}
