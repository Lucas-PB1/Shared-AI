import { createBrowserClient } from '@supabase/ssr';

import { getSupabaseEnv } from '@/shared/config/env';

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
