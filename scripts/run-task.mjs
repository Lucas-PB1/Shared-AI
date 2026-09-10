#!/usr/bin/env node
/**
 * Tarefas npm cross-platform (Windows/Linux) — sem bash.
 * Uso: node scripts/run-task.mjs <tarefa> [args...]
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const UNIT_TESTS = ['tests/linked-project-slug.test.ts'];

const task = process.argv[2];

if (!task || task === '-h' || task === '--help') {
  console.log(`Uso: node scripts/run-task.mjs <tarefa> [args...]

Tarefas: lint:ts, lint:shell, test`);
  process.exit(0);
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function tsxEntry() {
  const mjs = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
  if (existsSync(mjs)) return mjs;
  fail('tsx não encontrado. Rode npm install na raiz.');
}

function tscEntry() {
  const js = join(ROOT, 'node_modules/typescript/lib/tsc.js');
  if (existsSync(js)) return js;
  fail('typescript não encontrado. Rode npm install na raiz.');
}

function runNode(script, scriptArgs = [], opts = {}) {
  const result = spawnSync(process.execPath, [script, ...scriptArgs], {
    stdio: 'inherit',
    cwd: opts.cwd ?? process.cwd(),
    env: { ...process.env, SHARED_AI_ROOT: ROOT, ...opts.env },
    windowsHide: true,
  });
  return result.status ?? 1;
}

function hasCommand(cmd) {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(finder, [cmd], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return result.status === 0;
}

function gitLs(pattern) {
  const result = spawnSync('git', ['-C', ROOT, 'ls-files', pattern], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) return [];
  return String(result.stdout ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function lintTs() {
  process.exit(
    runNode(tscEntry(), ['-p', 'tsconfig.tooling.json', '--noEmit'], {
      cwd: ROOT,
    }),
  );
}

function lintShell() {
  if (!hasCommand('shellcheck')) {
    console.error(`shellcheck não encontrado no PATH.

No Windows: winget install koalaman.shellcheck
No Debian/Ubuntu: sudo apt install shellcheck

Depois: npm run lint:shell`);
    process.exit(0);
  }
  const files = gitLs('*.sh');
  if (files.length === 0) {
    console.log('Nenhum *.sh versionado.');
    process.exit(0);
  }
  console.log(`ShellCheck — ${files.length} script(s)`);
  process.exit(
    spawnSync('shellcheck', ['-x', '--severity=error', ...files], {
      stdio: 'inherit',
      cwd: ROOT,
      windowsHide: true,
    }).status ?? 1,
  );
}

function testAll() {
  process.exit(runNode(tsxEntry(), ['--test', ...UNIT_TESTS], { cwd: ROOT }));
}

const TASKS = {
  'lint:ts': lintTs,
  'lint:shell': lintShell,
  test: testAll,
};

const fn = TASKS[task];
if (!fn) fail(`Tarefa desconhecida: ${task}`);
fn();
