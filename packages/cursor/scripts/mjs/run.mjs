#!/usr/bin/env node
/**
 * Dispatcher Windows/Linux: win32 → PowerShell, linux → bash.
 * Outros SOs não são suportados.
 * Uso: node packages/cursor/scripts/mjs/run.mjs <comando> [args...]
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const platform = process.platform;
const isWin = platform === 'win32';
const isLinux = platform === 'linux';

if (!isWin && !isLinux) {
  console.error(
    `HostDime IA: plataforma não suportada (${platform}). Use Windows ou Linux.`
  );
  process.exit(1);
}

const scriptsDir = join(__dirname, '..');
const shDir = join(scriptsDir, 'sh');
const ps1Dir = join(scriptsDir, 'ps1');
const toolsSh = join(scriptsDir, '../../code-review/tools/sh');

const BASH_MAP = {
  install: join(shDir, 'install.sh'),
  'setup-code-review': join(scriptsDir, '../../code-review/scripts/install.sh'),
  'bootstrap-project': join(shDir, 'bootstrap-project.sh'),
  'detach-project': join(shDir, 'detach-project.sh'),
  'sync-all': join(shDir, 'sync-all.sh'),
  status: join(shDir, 'status.sh'),
  doctor: join(shDir, 'doctor.sh'),
  'review-ci': join(toolsSh, 'review-ci.sh'),
  'boot-sync': join(shDir, 'boot-sync.sh'),
  historico: join(shDir, 'historico-cli.sh'),
  memoria: join(toolsSh, 'review-memoria.sh'),
  'cursor-cli': join(shDir, 'install-cursor-cli.sh'),
  agent: join(shDir, 'agent-cli.sh'),
  'sync-inbox': join(shDir, 'sync-inbox.sh'),
  onboard: join(shDir, 'onboard.sh'),
  health: join(shDir, 'health.sh'),
};

const PS1_MAP = {
  install: join(ps1Dir, 'Install.ps1'),
  'setup-code-review': join(ps1Dir, 'Install-CodeReview.ps1'),
  'bootstrap-project': join(ps1Dir, 'Bootstrap-Project.ps1'),
  'detach-project': join(ps1Dir, 'Detach-Project.ps1'),
  'sync-all': join(ps1Dir, 'Sync-All.ps1'),
  status: join(ps1Dir, 'Status.ps1'),
  doctor: join(ps1Dir, 'Doctor.ps1'),
  'boot-sync': join(ps1Dir, 'Boot-Sync.ps1'),
  historico: join(ps1Dir, 'Historico.ps1'),
  'cursor-cli': join(ps1Dir, 'Install-CursorCli.ps1'),
  agent: join(ps1Dir, 'Agent.ps1'),
  onboard: join(ps1Dir, 'Onboard.ps1'),
  health: join(ps1Dir, 'Health.ps1'),
};

const ALIASES = {
  sync: 'sync-all',
  bootstrap: 'bootstrap-project',
  detach: 'detach-project',
  'setup:skills': 'install',
  'setup-code-review': 'setup-code-review',
  'review:ci': 'review-ci',
};

function resolveCommand(name) {
  const key = ALIASES[name] ?? name;
  const map = isWin ? PS1_MAP : BASH_MAP;
  return { key, script: map[key] };
}

function runPowerShell(script, args) {
  const shell = process.env.HOSTDIME_POWERSHELL ?? 'powershell.exe';
  const psArgs = [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    script,
    ...args,
  ];
  const result = spawnSync(shell, psArgs, { stdio: 'inherit', shell: false });
  process.exit(result.status ?? 1);
}

function runBash(script, args) {
  const env = { ...process.env };
  if (process.argv[2] === 'review-ci' || process.argv[2] === 'review:ci') {
    env.HOSTDIME_IA_ROOT = env.HOSTDIME_IA_ROOT ?? process.cwd();
  }
  const result = spawnSync('bash', [script, ...args], {
    stdio: 'inherit',
    env,
    shell: false,
  });
  process.exit(result.status ?? 1);
}

const [command, ...args] = process.argv.slice(2);

if (!command || command === '--help' || command === '-h') {
  console.log(`Uso: node run.mjs <comando> [args...]

Comandos: install, setup-code-review, bootstrap, detach, sync, status, doctor, boot-sync, historico, memoria, cursor-cli, agent, sync-inbox, onboard, health`);
  process.exit(0);
}

const { key, script } = resolveCommand(command);

if (!script || !existsSync(script)) {
  if (isWin && key === 'review-ci') {
    console.error('review:ci no Windows requer Git Bash (bash no PATH).');
    process.exit(1);
  }
  console.error(`Script não encontrado para "${command}": ${script ?? '(desconhecido)'}`);
  process.exit(1);
}

if (isWin) {
  runPowerShell(script, args);
} else {
  runBash(script, args);
}
