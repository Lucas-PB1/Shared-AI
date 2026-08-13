import { createBrowserClient } from '@supabase/ssr';

import { CONNECTION_COOKIE } from '@/shared/config/connection-public';

function readBrowserCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return undefined;
  return decodeURIComponent(match.slice(name.length + 1));
}

export function createClient() {
  const url =
    readBrowserCookie(CONNECTION_COOKIE.url) ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    readBrowserCookie(CONNECTION_COOKIE.publishable) ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase URL/publishable ausentes (cookie ou NEXT_PUBLIC_* bootstrap)',
    );
  }

  return createBrowserClient(url, publishableKey);
}
