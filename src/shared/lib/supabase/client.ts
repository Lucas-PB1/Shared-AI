import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase URL/publishable ausentes (NEXT_PUBLIC_SUPABASE_* no .env local)',
    );
  }

  return createBrowserClient(url, publishableKey);
}
