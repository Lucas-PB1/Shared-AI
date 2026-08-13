import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import {
  getCloudPair,
  getLocalPair,
  type SupabasePair,
} from '@/shared/config/env';

function requirePair(pair: SupabasePair, label: string) {
  if (!pair.url || !pair.secretKey) {
    throw new Error(`${label}: URL e secret key são obrigatórios`);
  }
  return pair;
}

export function createServiceClient(pair: SupabasePair, label: string) {
  const resolved = requirePair(pair, label);
  return createSupabaseClient(resolved.url, resolved.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'hostdime-ia-settings' } },
  });
}

export function createLocalServiceClient() {
  return createServiceClient(getLocalPair(), 'local');
}

export function createCloudServiceClient() {
  return createServiceClient(getCloudPair(), 'cloud');
}
