#!/usr/bin/env node
/**
 * Seed app_connections via REST (sem supabase-js / WebSocket).
 * Usage: node scripts/seed-connections.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_PATH = resolve(ROOT, '.env');
const PROJECT_REF = 'toekmpljxeulcquqhkxt';

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

function get(map, ...keys) {
  for (const k of keys) {
    const v = map.get(k);
    if (v) return v;
  }
  return '';
}

function refreshLocal(map) {
  try {
    const raw = execSync('npx supabase status -o env', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const status = parseEnv(raw.replace(/^export /gm, ''));
    const strip = (v) => (v || '').replaceAll('"', '');
    return {
      url: strip(status.get('API_URL')) || 'http://127.0.0.1:54321',
      publishable: strip(status.get('PUBLISHABLE_KEY')),
      secret: strip(status.get('SECRET_KEY')),
    };
  } catch {
    return {
      url:
        get(map, 'SUPABASE_LOCAL_URL', 'NEXT_PUBLIC_SUPABASE_URL') ||
        'http://127.0.0.1:54321',
      publishable: get(
        map,
        'SUPABASE_LOCAL_PUBLISHABLE_KEY',
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      ),
      secret: get(
        map,
        'SUPABASE_LOCAL_SECRET_KEY',
        'SUPABASE_SECRET_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ),
    };
  }
}

function refreshCloud(map) {
  try {
    const raw = execSync(
      `npx supabase projects api-keys --project-ref ${PROJECT_REF} --reveal -o json`,
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const data = JSON.parse(raw);
    const keys = Array.isArray(data) ? data : data.keys || [];
    const publishable = keys.find((k) => k.type === 'publishable');
    const secret = keys.find((k) => k.type === 'secret');
    return {
      url: `https://${PROJECT_REF}.supabase.co`,
      publishable: publishable?.api_key || '',
      secret: secret?.api_key || '',
    };
  } catch {
    return {
      url: get(map, 'SUPABASE_CLOUD_URL') || `https://${PROJECT_REF}.supabase.co`,
      publishable: get(map, 'SUPABASE_CLOUD_PUBLISHABLE_KEY'),
      secret: get(map, 'SUPABASE_CLOUD_SECRET_KEY'),
    };
  }
}

async function restUpsert(baseUrl, secret, path, body) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${baseUrl} ${path}: HTTP ${res.status} ${await res.text()}`);
  }
}

async function upsertAll(baseUrl, secret, local, cloud, active) {
  const now = new Date().toISOString();
  await restUpsert(baseUrl, secret, 'app_connections?on_conflict=target', [
    {
      target: 'local',
      url: local.url,
      publishable_key: local.publishable,
      secret_key: local.secret,
      updated_at: now,
    },
    {
      target: 'cloud',
      url: cloud.url,
      publishable_key: cloud.publishable,
      secret_key: cloud.secret,
      updated_at: now,
    },
  ]);
  await restUpsert(baseUrl, secret, 'app_settings?on_conflict=id', {
    id: 1,
    active_target: active,
    updated_at: now,
  });
}

if (!existsSync(ENV_PATH)) {
  console.error('Sem .env — copie de .env.example (bootstrap).');
  process.exit(1);
}

const map = parseEnv(readFileSync(ENV_PATH, 'utf8'));
const local = refreshLocal(map);
const cloud = refreshCloud(map);
const active =
  get(map, 'SUPABASE_TARGET', 'NEXT_PUBLIC_SUPABASE_TARGET') === 'cloud'
    ? 'cloud'
    : 'local';

const bootUrl =
  get(map, 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL') || local.url;
const bootSecret =
  get(map, 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY') || local.secret;

if (!bootUrl || !bootSecret) {
  console.error('Bootstrap URL/secret ausentes no .env');
  process.exit(1);
}

await upsertAll(bootUrl, bootSecret, local, cloud, active);
console.log(`bootstrap OK (${bootUrl})`);

if (local.secret && cloud.secret) {
  try {
    await upsertAll(local.url, local.secret, local, cloud, active);
    await upsertAll(cloud.url, cloud.secret, local, cloud, active);
    console.log('Espelhado em local + cloud');
  } catch (err) {
    console.warn('Espelho peer parcial:', err.message);
  }
}

console.log(`OK active=${active}`);
console.log(
  `local url=${local.url} pub=${local.publishable ? 'yes' : 'no'} sec=${local.secret ? 'yes' : 'no'}`,
);
console.log(
  `cloud url=${cloud.url} pub=${cloud.publishable ? 'yes' : 'no'} sec=${cloud.secret ? 'yes' : 'no'}`,
);
