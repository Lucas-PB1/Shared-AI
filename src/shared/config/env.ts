function readProcess(key: string): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

const DEFAULT_LOCAL_URL = 'http://127.0.0.1:54321';

export function getPublicSupabaseConfig(): {
  url: string;
  publishableKey: string;
} | null {
  const url =
    readProcess('NEXT_PUBLIC_SUPABASE_URL') ||
    readProcess('SUPABASE_URL') ||
    DEFAULT_LOCAL_URL;
  const publishableKey = readProcess('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const config = getPublicSupabaseConfig();
  if (!config) {
    throw new Error(
      'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env (Supabase local).',
    );
  }
  return config;
}
