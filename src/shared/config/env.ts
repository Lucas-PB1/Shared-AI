import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export type SupabaseTarget = 'local' | 'cloud';

export type SupabasePair = {
  url: string;
  /** sb_publishable_… (cloud) ou JWT legado (local) */
  publishableKey: string;
  /** sb_secret_… (cloud) ou service_role JWT (local) */
  secretKey: string;
};

const ROOT = process.cwd();
const ENV_PATH = resolve(ROOT, '.env');

function readProcess(key: string): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

function firstDefined(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readProcess(key);
    if (value) return value;
  }
  return undefined;
}

export function getTarget(): SupabaseTarget {
  const raw =
    readProcess('NEXT_PUBLIC_SUPABASE_TARGET') ||
    readProcess('SUPABASE_TARGET') ||
    'local';
  return raw === 'cloud' ? 'cloud' : 'local';
}

export function getSupabaseEnv() {
  const url = readProcess('NEXT_PUBLIC_SUPABASE_URL');
  const publishableKey = readProcess('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  if (!url || !publishableKey) {
    throw new Error(
      'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (npm run env:switch)',
    );
  }

  return { url, publishableKey, target: getTarget() };
}

function pairFromPrefix(prefix: 'LOCAL' | 'CLOUD', fallbackUrl: string): SupabasePair {
  return {
    url: readProcess(`SUPABASE_${prefix}_URL`) || fallbackUrl,
    publishableKey: readProcess(`SUPABASE_${prefix}_PUBLISHABLE_KEY`) || '',
    secretKey:
      firstDefined(
        `SUPABASE_${prefix}_SECRET_KEY`,
        `SUPABASE_${prefix}_SERVICE_ROLE_KEY`,
      ) || '',
  };
}

export function getLocalPair(): SupabasePair {
  return pairFromPrefix('LOCAL', 'http://127.0.0.1:54321');
}

export function getCloudPair(): SupabasePair {
  return pairFromPrefix('CLOUD', 'https://toekmpljxeulcquqhkxt.supabase.co');
}

export function getActiveSecretKey(): string {
  const target = getTarget();
  const key =
    (target === 'cloud' ? getCloudPair().secretKey : getLocalPair().secretKey) ||
    firstDefined('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY') ||
    '';
  if (!key) {
    throw new Error('Secret key ausente para o target ativo');
  }
  return key;
}

/** @deprecated use getActiveSecretKey */
export function getActiveServiceRoleKey(): string {
  return getActiveSecretKey();
}

export function canWriteEnvFile(): boolean {
  return readProcess('ALLOW_ENV_WRITE') === '1';
}

function parseEnvFile(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split(/\n/)) {
    if (!line || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    map.set(line.slice(0, i).trim(), line.slice(i + 1));
  }
  return map;
}

const DROPPED_ENV_KEYS = new Set([
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_LOCAL_ANON_KEY',
  'SUPABASE_CLOUD_ANON_KEY',
  'SUPABASE_ANON_KEY',
]);

function serializeEnv(map: Map<string, string>, original: string): string {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const line of original.split(/\n/)) {
    if (!line || line.trimStart().startsWith('#')) {
      out.push(line);
      continue;
    }
    const i = line.indexOf('=');
    if (i <= 0) {
      out.push(line);
      continue;
    }
    const key = line.slice(0, i).trim();
    if (DROPPED_ENV_KEYS.has(key)) continue;
    if (map.has(key)) {
      out.push(`${key}=${map.get(key)}`);
      seen.add(key);
    } else {
      out.push(line);
    }
  }

  for (const [key, value] of map) {
    if (seen.has(key) || DROPPED_ENV_KEYS.has(key)) continue;
    out.push(`${key}=${value}`);
  }

  return `${out.join('\n').replace(/\n+$/, '')}\n`;
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

export function writeConnectionEnv(input: ConnectionWriteInput): void {
  if (!canWriteEnvFile()) {
    throw new Error('ALLOW_ENV_WRITE=1 é necessário para gravar .env');
  }
  if (!existsSync(ENV_PATH)) {
    throw new Error('.env não encontrado');
  }

  const original = readFileSync(ENV_PATH, 'utf8');
  const map = parseEnvFile(original);

  const set = (key: string, value: string | undefined) => {
    if (value === undefined) return;
    map.set(key, value);
  };

  set('SUPABASE_LOCAL_URL', input.localUrl);
  set('SUPABASE_LOCAL_PUBLISHABLE_KEY', input.localPublishableKey);
  set('SUPABASE_LOCAL_SECRET_KEY', input.localSecretKey);
  set('SUPABASE_CLOUD_URL', input.cloudUrl);
  set('SUPABASE_CLOUD_PUBLISHABLE_KEY', input.cloudPublishableKey);
  set('SUPABASE_CLOUD_SECRET_KEY', input.cloudSecretKey);

  const target = input.target ?? getTarget();
  set('SUPABASE_TARGET', target);
  set('NEXT_PUBLIC_SUPABASE_TARGET', target);

  const prefix = target === 'local' ? 'LOCAL' : 'CLOUD';
  const url = map.get(`SUPABASE_${prefix}_URL`) || '';
  const publishable = map.get(`SUPABASE_${prefix}_PUBLISHABLE_KEY`) || '';
  const secret =
    map.get(`SUPABASE_${prefix}_SECRET_KEY`) ||
    map.get(`SUPABASE_${prefix}_SERVICE_ROLE_KEY`) ||
    '';

  if (!url || !publishable) {
    throw new Error(`URL/publishable incompletos para target ${target}`);
  }

  set('SUPABASE_URL', url);
  set('SUPABASE_SECRET_KEY', secret);
  set('SUPABASE_SERVICE_ROLE_KEY', secret);
  set('NEXT_PUBLIC_SUPABASE_URL', url);
  set('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', publishable);
  map.delete('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  map.delete('SUPABASE_LOCAL_ANON_KEY');
  map.delete('SUPABASE_CLOUD_ANON_KEY');
  map.delete('SUPABASE_ANON_KEY');

  writeFileSync(ENV_PATH, serializeEnv(map, original));
}

export function getConnectionPublicSnapshot() {
  const local = getLocalPair();
  const cloud = getCloudPair();
  return {
    target: getTarget(),
    allowEnvWrite: canWriteEnvFile(),
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
}
