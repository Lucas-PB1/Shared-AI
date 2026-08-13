#!/usr/bin/env node
/**
 * Atualiza só o bootstrap do .env (URL/publishable/secret ativos).
 * Pares local/cloud: npm run connections:seed → tabela app_connections.
 * Usage: node scripts/env-switch.mjs local|cloud [--refresh-keys]
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_PATH = resolve(ROOT, '.env');
const PROJECT_REF = 'toekmpljxeulcquqhkxt';

const target = (process.argv[2] || '').trim().toLowerCase();
const refreshKeys = process.argv.includes('--refresh-keys');

if (target !== 'local' && target !== 'cloud') {
  console.error('Uso: npm run env:switch -- local|cloud [--refresh-keys]');
  console.error('Depois: npm run connections:seed');
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
  const drop = new Set([
    'ALLOW_ENV_WRITE',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_LOCAL_ANON_KEY',
    'SUPABASE_CLOUD_ANON_KEY',
    'SUPABASE_ANON_KEY',
  ]);

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
    if (drop.has(key)) continue;
    if (map.has(key)) {
      out.push(`${key}=${map.get(key)}`);
      seen.add(key);
    } else {
      out.push(line);
    }
  }
  for (const key of map.keys()) {
    if (seen.has(key) || drop.has(key)) continue;
    out.push(`${key}=${map.get(key)}`);
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

function set(map, key, value) {
  if (value == null || value === '') return;
  map.set(key, value);
}

function refreshLocal() {
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
}

function refreshCloud() {
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
}

if (!existsSync(ENV_PATH)) {
  console.error('Arquivo .env não encontrado. Copie de .env.example.');
  process.exit(1);
}

const original = readFileSync(ENV_PATH, 'utf8');
const map = parseEnv(original);

let pair;
if (refreshKeys || target === 'local') {
  try {
    pair = refreshLocal();
    set(map, 'SUPABASE_LOCAL_URL', pair.url);
    set(map, 'SUPABASE_LOCAL_PUBLISHABLE_KEY', pair.publishable);
    set(map, 'SUPABASE_LOCAL_SECRET_KEY', pair.secret);
  } catch (err) {
    console.warn('local refresh:', err.message);
  }
}
if (refreshKeys || target === 'cloud') {
  try {
    const cloud = refreshCloud();
    set(map, 'SUPABASE_CLOUD_URL', cloud.url);
    set(map, 'SUPABASE_CLOUD_PUBLISHABLE_KEY', cloud.publishable);
    set(map, 'SUPABASE_CLOUD_SECRET_KEY', cloud.secret);
    if (target === 'cloud') pair = cloud;
  } catch (err) {
    console.warn('cloud refresh:', err.message);
  }
}

if (!pair) {
  const prefix = target === 'local' ? 'LOCAL' : 'CLOUD';
  pair = {
    url: map.get(`SUPABASE_${prefix}_URL`) || (target === 'local' ? 'http://127.0.0.1:54321' : `https://${PROJECT_REF}.supabase.co`),
    publishable: map.get(`SUPABASE_${prefix}_PUBLISHABLE_KEY`) || '',
    secret: map.get(`SUPABASE_${prefix}_SECRET_KEY`) || '',
  };
}

if (!pair.url || !pair.publishable) {
  console.error('Faltam URL/publishable. Use --refresh-keys.');
  process.exit(1);
}

set(map, 'SUPABASE_TARGET', target);
set(map, 'NEXT_PUBLIC_SUPABASE_TARGET', target);
set(map, 'SUPABASE_URL', pair.url);
set(map, 'SUPABASE_SECRET_KEY', pair.secret || '');
set(map, 'SUPABASE_SERVICE_ROLE_KEY', pair.secret || '');
set(map, 'NEXT_PUBLIC_SUPABASE_URL', pair.url);
set(map, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', pair.publishable);
map.delete('ALLOW_ENV_WRITE');

writeFileSync(ENV_PATH, serializeEnv(map, original));
console.log(`bootstrap SUPABASE_TARGET=${target}`);
console.log(`NEXT_PUBLIC_SUPABASE_URL=${pair.url}`);
console.log('Rode: npm run connections:seed');
