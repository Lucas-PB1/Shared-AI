#!/usr/bin/env node
/**
 * Bump de versão Shared AI: VERSION + package.json + CHANGELOG.md.
 * Não cria commit (o usuário decide).
 *
 * Uso:
 *   node scripts/release.mjs patch|minor|major
 *   node scripts/release.mjs 0.4.0
 *   npm run release -- patch
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const VERSION_FILE = join(ROOT, 'VERSION');
const PACKAGE_JSON = join(ROOT, 'package.json');
const CHANGELOG = join(ROOT, 'CHANGELOG.md');

function parseSemver(raw) {
  const m = String(raw).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`Versão inválida: ${raw}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function formatSemver({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bump(ver, kind) {
  if (kind === 'major') return { major: ver.major + 1, minor: 0, patch: 0 };
  if (kind === 'minor') return { major: ver.major, minor: ver.minor + 1, patch: 0 };
  if (kind === 'patch') return { major: ver.major, minor: ver.minor, patch: ver.patch + 1 };
  return parseSemver(kind);
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function updateChangelog(prev, next) {
  let text = '';
  try {
    text = readFileSync(CHANGELOG, 'utf8');
  } catch {
    text = `# Changelog\n\n## [Unreleased]\n\n### Added\n\n### Changed\n\n### Fixed\n\n`;
  }

  const header = `## [${next}] — ${todayUtc()}\n\n### Added\n\n- \n\n### Changed\n\n### Fixed\n\n`;

  if (/^## \[Unreleased\]/m.test(text)) {
    text = text.replace(
      /## \[Unreleased\]\s*\n+(?:### Added\s*\n+)?(?:### Changed\s*\n+)?(?:### Fixed\s*\n+)?/,
      `## [Unreleased]\n\n### Added\n\n### Changed\n\n### Fixed\n\n${header}`,
    );
  } else {
    text = text.replace(/^# Changelog\s*\n+/, `# Changelog\n\n## [Unreleased]\n\n### Added\n\n### Changed\n\n### Fixed\n\n${header}`);
  }

  if (!text.includes(`## [${next}]`)) {
    // fallback append after Unreleased block
    text = text.replace(
      /## \[Unreleased\][\s\S]*?(?=\n## \[|$)/,
      (block) => `${block.trimEnd()}\n\n${header}`,
    );
  }

  // ensure compare link note not required
  void prev;
  writeFileSync(CHANGELOG, text.endsWith('\n') ? text : `${text}\n`);
}

function main() {
  const arg = process.argv[2];
  if (!arg || arg === '-h' || arg === '--help') {
    console.log(`Uso: node scripts/release.mjs <patch|minor|major|x.y.z>

Atualiza VERSION, package.json e abre seção no CHANGELOG.
Não faz git commit.`);
    process.exit(arg ? 0 : 1);
  }

  const currentRaw = readFileSync(VERSION_FILE, 'utf8').trim();
  const current = parseSemver(currentRaw);
  const next = formatSemver(bump(current, arg));

  if (next === currentRaw) {
    console.error('Versão destino igual à atual.');
    process.exit(1);
  }

  writeFileSync(VERSION_FILE, `${next}\n`);

  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
  pkg.version = next;
  writeFileSync(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`);

  updateChangelog(currentRaw, next);

  console.log(`release: ${currentRaw} → ${next}`);
  console.log('Atualizado: VERSION, package.json, CHANGELOG.md');
  console.log('Próximo: editar bullets do CHANGELOG e commit manual.');
}

main();
