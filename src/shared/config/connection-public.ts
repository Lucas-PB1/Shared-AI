export type SupabaseTarget = 'local' | 'cloud';

export const CONNECTION_COOKIE = {
  target: 'hd_sb_target',
  url: 'hd_sb_url',
  publishable: 'hd_sb_publishable',
} as const;

function readProcess(key: string): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

/** Sync helper: Edge/middleware/browser (sem next/headers). */
export function resolvePublicConfigFromEnvAndCookies(cookieStore: {
  get: (name: string) => { value: string } | undefined;
}): { url: string; publishableKey: string; target: SupabaseTarget } | null {
  const cookieUrl = cookieStore.get(CONNECTION_COOKIE.url)?.value;
  const cookieKey = cookieStore.get(CONNECTION_COOKIE.publishable)?.value;
  const cookieTarget = cookieStore.get(CONNECTION_COOKIE.target)?.value;

  if (cookieUrl && cookieKey) {
    return {
      url: cookieUrl,
      publishableKey: cookieKey,
      target: cookieTarget === 'cloud' ? 'cloud' : 'local',
    };
  }

  const url = readProcess('NEXT_PUBLIC_SUPABASE_URL');
  const publishableKey = readProcess('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !publishableKey) return null;
  const envTarget =
    readProcess('NEXT_PUBLIC_SUPABASE_TARGET') ||
    readProcess('SUPABASE_TARGET') ||
    'local';
  return {
    url,
    publishableKey,
    target: envTarget === 'cloud' ? 'cloud' : 'local',
  };
}
