#!/usr/bin/env node
/**
 * Bootstrap do monorepo: cria .env vazio (a partir de .env.example) e
 * instala deps. Não preenche secrets.
 *
 * Uso: npm run setup
 *      npm run setup -- --env-only
 *      npm run setup -- --force   # sobrescreve .env existente
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_PATH = resolve(ROOT, '.env');
const EXAMPLE_PATH = resolve(ROOT, '.env.example');

const args = new Set(process.argv.slice(2));
const envOnly = args.has('--env-only');
const force = args.has('--force');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function ensureEnv() {
  if (!existsSync(EXAMPLE_PATH)) {
    fail('Falta .env.example na raiz do monorepo.');
  }

  const existed = existsSync(ENV_PATH);
  if (existed && !force) {
    console.log('.env já existe — mantido (use --force para recriar vazio).');
    return false;
  }

  copyFileSync(EXAMPLE_PATH, ENV_PATH);
  const text = readFileSync(ENV_PATH, 'utf8');
  writeFileSync(ENV_PATH, text.endsWith('\n') ? text : `${text}\n`);
  console.log(
    existed
      ? '.env recriado a partir de .env.example (sem valores).'
      : '.env criado a partir de .env.example (sem valores).',
  );
  return true;
}

function npmInstall() {
  console.log('npm install…');
  const r = spawnSync('npm', ['install'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    fail('npm install falhou.');
  }
}

function printNextSteps() {
  console.log(`
Próximos passos:
  1. Preencha o .env  OU  npm run env:switch -- local --refresh-keys
  2. npm run supabase:start          # stack local (opcional)
  3. npm run connections:seed        # após ter secret no .env
  4. npm run dev                     # http://localhost:3000

Skills/code-review (outra máquina):
  npm run setup:skills
  npm run setup:code-review
`);
}

ensureEnv();
if (!envOnly) {
  npmInstall();
}
printNextSteps();
