#!/usr/bin/env node
/**
 * Resolve SUPABASE_* / NEXT_PUBLIC_* from LOCAL or CLOUD pairs.
 * Usa só publishable/secret (sb_*). Sem anon key.
 * Usage: node scripts/env-switch.mjs local|cloud [--refresh-keys]
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_PATH = resolve(ROOT, '.env');
const PROJECT_REF = 'toekmpljxeulcquqhkxt';

const DROPPED_ENV_KEYS = new Set([
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_LOCAL_ANON_KEY',
  'SUPABASE_CLOUD_ANON_KEY',
  'SUPABASE_ANON_KEY',
]);

const target = (process.argv[2] || '').trim().toLowerCase();
const refreshKeys = process.argv.includes('--refresh-keys');

if (target !== 'local' && target !== 'cloud') {
  console.error('Uso: npm run env:switch -- local|cloud [--refresh-keys]');
  process.exit(1);
}

function parseEnv(text) {
  const map = new Map();
  for (const line of text.split(/\n/)) {
    if (!line || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    map.set(line.slice(0, i).trim(), line.slice(i + 1));
  }
  return map;
}

function serializeEnv(map, original) {
  const seen = new Set();
  const out = [];

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

  for (const key of map.keys()) {
    if (seen.has(key) || DROPPED_ENV_KEYS.has(key)) continue;
    out.push(`${key}=${map.get(key)}`);
  }

  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

function set(map, key, value) {
  if (value == null || value === '') return;
  map.set(key, value);
}

function pickPairKey(map, prefix, kind) {
  if (kind === 'publishable') {
    return map.get(`SUPABASE_${prefix}_PUBLISHABLE_KEY`) || '';
  }
  return (
    map.get(`SUPABASE_${prefix}_SECRET_KEY`) ||
    map.get(`SUPABASE_${prefix}_SERVICE_ROLE_KEY`) ||
    ''
  );
}

function refreshLocalKeys(map) {
  try {
    const raw = execSync('npx supabase status -o env', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const status = parseEnv(raw.replace(/^export /gm, ''));
    const api = (status.get('API_URL') || '').replaceAll('"', '');
    const publishable = (status.get('PUBLISHABLE_KEY') || '').replaceAll('"', '');
    const secret = (status.get('SECRET_KEY') || '').replaceAll('"', '');
    if (!publishable || !secret) {
      throw new Error('PUBLISHABLE_KEY/SECRET_KEY ausentes no supabase status');
    }
    set(map, 'SUPABASE_LOCAL_URL', api || 'http://127.0.0.1:54321');
    set(map, 'SUPABASE_LOCAL_PUBLISHABLE_KEY', publishable);
    set(map, 'SUPABASE_LOCAL_SECRET_KEY', secret);
  } catch (err) {
    console.warn('Aviso: não foi possível ler supabase status (local).', err.message);
  }
}

function refreshCloudKeys(map) {
  try {
    const raw = execSync(
      `npx supabase projects api-keys --project-ref ${PROJECT_REF}`,
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const parsed = JSON.parse(raw);
    const keys = parsed.keys || [];
    const publishable =
      keys.find((k) => k.type === 'publishable') ||
      keys.find((k) => String(k.api_key || '').startsWith('sb_publishable_'));
    const secret =
      keys.find((k) => k.type === 'secret') ||
      keys.find((k) => String(k.api_key || '').startsWith('sb_secret_'));

    const publishableKey = publishable?.api_key || publishable?.key;
    const secretKey = secret?.api_key || secret?.key;
    if (!publishableKey || !secretKey) {
      throw new Error('publishable/secret ausentes no cloud (sem fallback anon)');
    }

    set(map, 'SUPABASE_CLOUD_URL', `https://${PROJECT_REF}.supabase.co`);
    set(map, 'SUPABASE_CLOUD_PUBLISHABLE_KEY', publishableKey);
    set(map, 'SUPABASE_CLOUD_SECRET_KEY', secretKey);
  } catch (err) {
    console.warn('Aviso: não foi possível ler api-keys do cloud.', err.message);
  }
}

if (!existsSync(ENV_PATH)) {
  console.error('Arquivo .env não encontrado. Copie de .env.example.');
  process.exit(1);
}

const original = readFileSync(ENV_PATH, 'utf8');
const map = parseEnv(original);

for (const key of DROPPED_ENV_KEYS) map.delete(key);

// Migra SERVICE_ROLE → SECRET se SECRET vazio
for (const prefix of ['LOCAL', 'CLOUD']) {
  if (!map.get(`SUPABASE_${prefix}_SECRET_KEY`) && map.get(`SUPABASE_${prefix}_SERVICE_ROLE_KEY`)) {
    set(map, `SUPABASE_${prefix}_SECRET_KEY`, map.get(`SUPABASE_${prefix}_SERVICE_ROLE_KEY`));
  }
}

set(map, 'SUPABASE_TARGET', target);
set(map, 'ALLOW_ENV_WRITE', map.get('ALLOW_ENV_WRITE') ?? '1');
set(map, 'REVIEW_PROJECT_SLUG', map.get('REVIEW_PROJECT_SLUG') ?? 'hostdime-ia');
set(map, 'SUPABASE_CLOUD_URL', map.get('SUPABASE_CLOUD_URL') ?? `https://${PROJECT_REF}.supabase.co`);
set(map, 'SUPABASE_LOCAL_URL', map.get('SUPABASE_LOCAL_URL') ?? 'http://127.0.0.1:54321');

if (refreshKeys || target === 'local') refreshLocalKeys(map);
if (refreshKeys || target === 'cloud') refreshCloudKeys(map);

const prefix = target === 'local' ? 'LOCAL' : 'CLOUD';
const url = map.get(`SUPABASE_${prefix}_URL`);
const publishable = pickPairKey(map, prefix, 'publishable');
const secret = pickPairKey(map, prefix, 'secret');

if (!url || !publishable) {
  console.error(
    `Faltam SUPABASE_${prefix}_URL / SUPABASE_${prefix}_PUBLISHABLE_KEY. Rode com --refresh-keys.`,
  );
  process.exit(1);
}

set(map, 'SUPABASE_URL', url);
set(map, 'SUPABASE_SECRET_KEY', secret || '');
set(map, 'SUPABASE_SERVICE_ROLE_KEY', secret || '');
set(map, 'NEXT_PUBLIC_SUPABASE_URL', url);
set(map, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', publishable);
set(map, 'NEXT_PUBLIC_SUPABASE_TARGET', target);

writeFileSync(ENV_PATH, serializeEnv(map, original));
console.log(`SUPABASE_TARGET=${target}`);
console.log(`NEXT_PUBLIC_SUPABASE_URL=${url}`);
console.log(
  `publishable=${publishable.startsWith('sb_publishable_') ? 'sb_publishable' : 'other'} len=${publishable.length}`,
);
console.log(
  `secret=${secret.startsWith('sb_secret_') ? 'sb_secret' : secret ? 'other' : 'missing'} len=${secret.length}`,
);
