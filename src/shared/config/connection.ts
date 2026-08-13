import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import {
  CONNECTION_COOKIE,
  resolvePublicConfigFromEnvAndCookies,
  type SupabaseTarget,
} from '@/shared/config/connection-public';

export type { SupabaseTarget };
export { CONNECTION_COOKIE, resolvePublicConfigFromEnvAndCookies };

export type SupabasePair = {
  url: string;
  publishableKey: string;
  secretKey: string;
};

export type ConnectionSnapshot = {
  target: SupabaseTarget;
  local: {
    url: string;
    publishableKeySet: boolean;
    secretKeySet: boolean;
  };
  cloud: {
    url: string;
    publishableKeySet: boolean;
    secretKeySet: boolean;
  };
};

const DEFAULT_LOCAL_URL = 'http://127.0.0.1:54321';
const DEFAULT_CLOUD_URL = 'https://toekmpljxeulcquqhkxt.supabase.co';

function readProcess(key: string): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

/** Bootstrap: conexão mínima do processo (nunca gravada pela UI). */
export function getBootstrapPair(): SupabasePair {
  return {
    url:
      readProcess('NEXT_PUBLIC_SUPABASE_URL') ||
      readProcess('SUPABASE_URL') ||
      DEFAULT_LOCAL_URL,
    publishableKey: readProcess('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || '',
    secretKey:
      readProcess('SUPABASE_SECRET_KEY') ||
      readProcess('SUPABASE_SERVICE_ROLE_KEY') ||
      '',
  };
}

export function createBootstrapServiceClient() {
  const pair = getBootstrapPair();
  if (!pair.url || !pair.secretKey) {
    throw new Error(
      'Bootstrap ausente: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env',
    );
  }
  return createSupabaseClient(pair.url, pair.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createServiceClient(pair: SupabasePair, label: string) {
  if (!pair.url || !pair.secretKey) {
    throw new Error(`${label}: URL e secret key são obrigatórios`);
  }
  return createSupabaseClient(pair.url, pair.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type ConnectionRow = {
  target: SupabaseTarget;
  url: string;
  publishable_key: string;
  secret_key: string;
};

// Client tipado frouxo: schema gerado não inclui app_connections ainda.
type DbClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

async function loadRowsFromClient(client: DbClient): Promise<ConnectionRow[]> {
  const { data, error } = await client
    .from('app_connections')
    .select('target, url, publishable_key, secret_key');
  if (error) throw error;
  return (data ?? []) as ConnectionRow[];
}

function rowToPair(row: ConnectionRow | undefined, fallbackUrl: string): SupabasePair {
  return {
    url: row?.url || fallbackUrl,
    publishableKey: row?.publishable_key || '',
    secretKey: row?.secret_key || '',
  };
}

export async function loadConnectionPairs(): Promise<{
  local: SupabasePair;
  cloud: SupabasePair;
  activeTarget: SupabaseTarget;
}> {
  const bootstrap = createBootstrapServiceClient();
  const rows = await loadRowsFromClient(bootstrap);
  const byTarget = new Map(rows.map((r) => [r.target, r]));

  const { data: settings } = await bootstrap
    .from('app_settings')
    .select('active_target')
    .eq('id', 1)
    .maybeSingle();

  const activeTarget: SupabaseTarget =
    settings?.active_target === 'cloud' ? 'cloud' : 'local';

  return {
    local: rowToPair(byTarget.get('local'), DEFAULT_LOCAL_URL),
    cloud: rowToPair(byTarget.get('cloud'), DEFAULT_CLOUD_URL),
    activeTarget,
  };
}

export async function getLocalPair(): Promise<SupabasePair> {
  const { local } = await loadConnectionPairs();
  return local;
}

export async function getCloudPair(): Promise<SupabasePair> {
  const { cloud } = await loadConnectionPairs();
  return cloud;
}

export async function getTarget(): Promise<SupabaseTarget> {
  const jar = await cookies();
  const fromCookie = jar.get(CONNECTION_COOKIE.target)?.value;
  if (fromCookie === 'local' || fromCookie === 'cloud') return fromCookie;

  try {
    const { activeTarget } = await loadConnectionPairs();
    return activeTarget;
  } catch {
    const env =
      readProcess('NEXT_PUBLIC_SUPABASE_TARGET') ||
      readProcess('SUPABASE_TARGET') ||
      'local';
    return env === 'cloud' ? 'cloud' : 'local';
  }
}

export async function getSupabaseEnv() {
  const jar = await cookies();
  const cookieUrl = jar.get(CONNECTION_COOKIE.url)?.value;
  const cookieKey = jar.get(CONNECTION_COOKIE.publishable)?.value;
  const cookieTarget = jar.get(CONNECTION_COOKIE.target)?.value;

  if (cookieUrl && cookieKey) {
    return {
      url: cookieUrl,
      publishableKey: cookieKey,
      target: (cookieTarget === 'cloud' ? 'cloud' : 'local') as SupabaseTarget,
    };
  }

  try {
    const { local, cloud, activeTarget } = await loadConnectionPairs();
    const pair = activeTarget === 'cloud' ? cloud : local;
    if (pair.url && pair.publishableKey) {
      return {
        url: pair.url,
        publishableKey: pair.publishableKey,
        target: activeTarget,
      };
    }
  } catch {
    // fallback bootstrap
  }

  const bootstrap = getBootstrapPair();
  if (!bootstrap.url || !bootstrap.publishableKey) {
    throw new Error(
      'Defina bootstrap NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY ou salve conexões em /settings',
    );
  }
  return {
    url: bootstrap.url,
    publishableKey: bootstrap.publishableKey,
    target: await getTarget(),
  };
}

export async function getActiveSecretKey(): Promise<string> {
  const target = await getTarget();
  const { local, cloud } = await loadConnectionPairs();
  const key = (target === 'cloud' ? cloud : local).secretKey;
  if (key) return key;
  const bootstrap = getBootstrapPair().secretKey;
  if (bootstrap) return bootstrap;
  throw new Error('Secret key ausente para o target ativo');
}

export async function getConnectionPublicSnapshot(): Promise<ConnectionSnapshot> {
  try {
    const { local, cloud, activeTarget } = await loadConnectionPairs();
    const jar = await cookies();
    const cookieTarget = jar.get(CONNECTION_COOKIE.target)?.value;
    const target: SupabaseTarget =
      cookieTarget === 'local' || cookieTarget === 'cloud'
        ? cookieTarget
        : activeTarget;

    return {
      target,
      local: {
        url: local.url,
        publishableKeySet: Boolean(local.publishableKey),
        secretKeySet: Boolean(local.secretKey),
      },
      cloud: {
        url: cloud.url,
        publishableKeySet: Boolean(cloud.publishableKey),
        secretKeySet: Boolean(cloud.secretKey),
      },
    };
  } catch {
    const b = getBootstrapPair();
    return {
      target: 'local',
      local: {
        url: b.url || DEFAULT_LOCAL_URL,
        publishableKeySet: Boolean(b.publishableKey),
        secretKeySet: Boolean(b.secretKey),
      },
      cloud: {
        url: DEFAULT_CLOUD_URL,
        publishableKeySet: false,
        secretKeySet: false,
      },
    };
  }
}

export type ConnectionWriteInput = {
  target?: SupabaseTarget;
  localUrl?: string;
  localPublishableKey?: string;
  localSecretKey?: string;
  cloudUrl?: string;
  cloudPublishableKey?: string;
  cloudSecretKey?: string;
};

function mergePair(
  current: SupabasePair,
  url?: string,
  publishable?: string,
  secret?: string,
): SupabasePair {
  return {
    url: url && url.length > 0 ? url : current.url,
    publishableKey:
      publishable && publishable.length > 0 ? publishable : current.publishableKey,
    secretKey: secret && secret.length > 0 ? secret : current.secretKey,
  };
}

async function upsertPair(
  client: DbClient,
  target: SupabaseTarget,
  pair: SupabasePair,
) {
  const { error } = await client.from('app_connections').upsert(
    {
      target,
      url: pair.url,
      publishable_key: pair.publishableKey,
      secret_key: pair.secretKey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'target' },
  );
  if (error) throw error;
}

async function setActiveTarget(client: DbClient, target: SupabaseTarget) {
  const { error } = await client.from('app_settings').upsert(
    {
      id: 1,
      active_target: target,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

export async function applyActiveCookies(
  target: SupabaseTarget,
  pair: SupabasePair,
) {
  const jar = await cookies();
  const base = {
    path: '/',
    sameSite: 'lax' as const,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  };
  jar.set(CONNECTION_COOKIE.target, target, base);
  jar.set(CONNECTION_COOKIE.url, pair.url, base);
  jar.set(CONNECTION_COOKIE.publishable, pair.publishableKey, base);
}

/** Persiste pares na tabela (bootstrap DB + peer se secret disponível). */
export async function saveConnections(input: ConnectionWriteInput): Promise<{
  target: SupabaseTarget;
  local: SupabasePair;
  cloud: SupabasePair;
}> {
  const current = await loadConnectionPairs().catch(() => ({
    local: {
      url: DEFAULT_LOCAL_URL,
      publishableKey: '',
      secretKey: '',
    } satisfies SupabasePair,
    cloud: {
      url: DEFAULT_CLOUD_URL,
      publishableKey: '',
      secretKey: '',
    } satisfies SupabasePair,
    activeTarget: 'local' as SupabaseTarget,
  }));

  const local = mergePair(
    current.local,
    input.localUrl,
    input.localPublishableKey,
    input.localSecretKey,
  );
  const cloud = mergePair(
    current.cloud,
    input.cloudUrl,
    input.cloudPublishableKey,
    input.cloudSecretKey,
  );
  const target = input.target ?? current.activeTarget;

  if (!local.url || !cloud.url) {
    throw new Error('URL local e cloud são obrigatórias');
  }

  const bootstrap = createBootstrapServiceClient();
  await upsertPair(bootstrap, 'local', local);
  await upsertPair(bootstrap, 'cloud', cloud);
  await setActiveTarget(bootstrap, target);

  // Espelha nos dois lados quando ambos os secrets existem
  if (local.secretKey && cloud.secretKey) {
    try {
      const localClient = createServiceClient(local, 'local');
      const cloudClient = createServiceClient(cloud, 'cloud');
      for (const client of [localClient, cloudClient]) {
        await upsertPair(client, 'local', local);
        await upsertPair(client, 'cloud', cloud);
        await setActiveTarget(client, target);
      }
    } catch (err) {
      console.warn('Espelho peer parcial:', err);
    }
  }

  const activePair = target === 'cloud' ? cloud : local;
  if (!activePair.publishableKey) {
    throw new Error(`Publishable key ausente para target ${target}`);
  }
  await applyActiveCookies(target, activePair);

  return { target, local, cloud };
}

export async function switchActiveTarget(target: SupabaseTarget) {
  const { local, cloud } = await loadConnectionPairs();
  const pair = target === 'cloud' ? cloud : local;
  if (!pair.url || !pair.publishableKey) {
    throw new Error(
      `Conexão ${target} incompleta. Salve URL e publishable em Configuração.`,
    );
  }

  const bootstrap = createBootstrapServiceClient();
  await setActiveTarget(bootstrap, target);

  if (local.secretKey && cloud.secretKey) {
    try {
      await setActiveTarget(createServiceClient(local, 'local'), target);
      await setActiveTarget(createServiceClient(cloud, 'cloud'), target);
    } catch {
      // ignore peer
    }
  }

  await applyActiveCookies(target, pair);
  return pair;
}

export async function testConnection(
  which: SupabaseTarget | 'active',
): Promise<{ ok: boolean; detail: string }> {
  const { local, cloud, activeTarget } = await loadConnectionPairs();
  const target = which === 'active' ? activeTarget : which;
  const pair = target === 'cloud' ? cloud : local;

  if (!pair.url) {
    return { ok: false, detail: `${target}: URL vazia` };
  }

  const key = pair.secretKey || pair.publishableKey;
  if (!key) {
    return { ok: false, detail: `${target}: sem publishable/secret` };
  }

  try {
    const health = await fetch(`${pair.url.replace(/\/$/, '')}/auth/v1/health`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (!health.ok) {
      return {
        ok: false,
        detail: `${target}: auth/health HTTP ${health.status}`,
      };
    }

    if (pair.secretKey) {
      const rest = await fetch(
        `${pair.url.replace(/\/$/, '')}/rest/v1/app_settings?select=id&limit=1`,
        {
          headers: {
            apikey: pair.secretKey,
            Authorization: `Bearer ${pair.secretKey}`,
          },
          cache: 'no-store',
        },
      );
      if (!rest.ok) {
        return {
          ok: false,
          detail: `${target}: REST HTTP ${rest.status} (secret ou schema)`,
        };
      }
    }

    return {
      ok: true,
      detail: `${target}: OK (${pair.secretKey ? 'secret' : 'publishable'})`,
    };
  } catch (err) {
    return {
      ok: false,
      detail: `${target}: ${err instanceof Error ? err.message : 'falha de rede'}`,
    };
  }
}
