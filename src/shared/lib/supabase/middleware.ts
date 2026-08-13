import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { resolvePublicConfigFromEnvAndCookies } from '@/shared/config/connection-public';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const config = resolvePublicConfigFromEnvAndCookies({
    get: (name) => request.cookies.get(name),
  });

  if (!config) {
    return { user: null, supabaseResponse };
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabaseResponse };
}
