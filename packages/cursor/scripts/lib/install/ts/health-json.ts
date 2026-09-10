#!/usr/bin/env node
/** health.sh --json: relatório de máquina + projetos registrados. */
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { detectProfile } from '../../profiles/ts/detect-stack.js';

function parseDotenvText(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith('#') || !stripped.includes('=')) {
      continue;
    }
    const eq = stripped.indexOf('=');
    const key = stripped.slice(0, eq).trim();
    let val = stripped.slice(eq + 1).trim();
    if (
      (val.startsWith("'") && val.endsWith("'")) ||
      (val.startsWith('"') && val.endsWith('"'))
    ) {
      val = val.slice(1, -1);
    }
    if (key) out[key] = val;
  }
  return out;
}

interface MachineReport {
  ok: boolean;
  version_clone: string | null;
  version_installed: string | null;
  issues: string[];
}

interface ProjectReport {
  path: string;
  ok: boolean;
  issues: string[];
  profile: string;
  git_dirty: number;
  suggested_profile?: string;
}

interface HealthResult {
  machine: MachineReport;
  projects: ProjectReport[];
  summary: { project_count: number; issues: number };
}

function parseEnvFile(envFile: string): Record<string, string> {
  if (!existsSync(envFile)) return {};
  return parseDotenvText(readFileSync(envFile, 'utf-8'));
}

function runHealthProject(project: string): ProjectReport {
  const item: ProjectReport = {
    path: project,
    ok: true,
    issues: [],
    profile: '—',
    git_dirty: 0,
  };

  if (!existsSync(project) || !statSync(project).isDirectory()) {
    item.ok = false;
    item.issues.push('missing');
    return item;
  }

  const rules = join(project, '.cursor/rules');
  if (existsSync(rules) && statSync(rules).isDirectory()) {
    let broken = 0;
    for (const name of readdirSync(rules)) {
      const f = join(rules, name);
      try {
        if (lstatSync(f).isSymbolicLink()) {
          try {
            realpathSync(f);
          } catch {
            broken += 1;
          }
        }
      } catch {
        // ignore
      }
    }
    if (broken) {
      item.issues.push(`broken_symlinks:${broken}`);
      item.ok = false;
    }

    let profileFound = false;
    for (const name of readdirSync(rules)) {
      if (name.endsWith('-project.mdc')) {
        item.profile = name.replace(/-project\.mdc$/, '');
        profileFound = true;
        break;
      }
    }
    if (!profileFound && existsSync(join(project, '.cursor/SKILLS-ROUTING.md'))) {
      item.profile = 'custom';
    }
  } else if (existsSync(join(project, '.cursor/SKILLS-ROUTING.md'))) {
    item.profile = 'custom';
  }

  const gitCheck = spawnSync('git', ['-C', project, 'rev-parse', '--is-inside-work-tree'], {
    encoding: 'utf-8',
  });
  if (gitCheck.status === 0) {
    const dirty = spawnSync('git', ['-C', project, 'status', '--porcelain'], {
      encoding: 'utf-8',
    });
    const lines = (dirty.stdout ?? '').trim().split('\n').filter(Boolean);
    item.git_dirty = lines.length;
    if (item.git_dirty) item.issues.push(`git_dirty:${item.git_dirty}`);
  } else {
    item.issues.push('no_git');
  }

  if (item.profile === '—') {
    try {
      const suggested = detectProfile(project);
      if (suggested) {
        item.suggested_profile = suggested;
        item.issues.push('missing_profile');
      }
    } catch {
      // ignore
    }
  }

  if (item.issues.length) item.ok = false;
  return item;
}

function main(): number {
  const [envFile, registryFile] = process.argv.slice(2);
  if (!envFile || !registryFile) {
    process.stderr.write('Uso: health-json.ts <env_file> <registry_file>\n');
    return 2;
  }

  const result: HealthResult = {
    machine: {
      ok: true,
      version_clone: null,
      version_installed: null,
      issues: [],
    },
    projects: [],
    summary: { project_count: 0, issues: 0 },
  };

  if (existsSync(envFile)) {
    const env = parseEnvFile(envFile);
    const root = env.SHARED_AI_ROOT ?? '';
    const verFile = root ? join(root, 'VERSION') : '';
    if (verFile && existsSync(verFile)) {
      result.machine.version_clone = readFileSync(verFile, 'utf-8').trim();
    }
    result.machine.version_installed = env.SHARED_AI_VERSION ?? null;
    if (result.machine.version_clone !== result.machine.version_installed) {
      result.machine.issues.push('version_mismatch');
      result.machine.ok = false;
    }
  } else {
    result.machine.issues.push('not_installed');
    result.machine.ok = false;
  }

  if (existsSync(registryFile)) {
    try {
      const data = JSON.parse(readFileSync(registryFile, 'utf-8')) as {
        projects?: { path?: string }[];
      };
      for (const entry of data.projects ?? []) {
        const path = entry.path ?? '';
        if (path && existsSync(path) && statSync(path).isDirectory()) {
          result.projects.push(runHealthProject(path));
        }
      }
    } catch {
      // ignore bad registry
    }
  }

  result.summary.project_count = result.projects.length;
  result.summary.issues = result.projects.reduce((n, p) => n + p.issues.length, 0);
  if (!result.machine.ok) {
    result.summary.issues += result.machine.issues.length;
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}
