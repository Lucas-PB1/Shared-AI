import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  applyAutoConfig,
  mergeConfig,
} from '../packages/cursor/scripts/lib/install/ts/merge-cursor-cli-config.js';
import { tempDir } from './helpers/tmp.js';

const TEMPLATE_PATH = join(import.meta.dirname, '../packages/cursor/templates/cli-config.auto.json');
const template = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf-8')) as Record<string, unknown>;

describe('cli-config template', () => {
  it('não usa unrestricted por padrão', () => {
    assert.equal(template.approvalMode, 'allowlist');
  });
});

describe('mergeConfig', () => {
  it('aplica allowlist quando o usuário ainda não escolheu um modo', () => {
    const [merged] = mergeConfig({}, template);
    assert.equal(merged.approvalMode, 'allowlist');
  });

  it('não sobrescreve o approvalMode escolhido pelo usuário', () => {
    const [merged] = mergeConfig({ approvalMode: 'unrestricted' }, template);
    assert.equal(merged.approvalMode, 'unrestricted');
    const [merged2] = mergeConfig({ approvalMode: 'custom' }, template);
    assert.equal(merged2.approvalMode, 'custom');
  });

  it('só vira unrestricted com opt-in explícito', () => {
    const [merged, mutated] = mergeConfig({ approvalMode: 'allowlist' }, template, {
      unrestricted: true,
    });
    assert.equal(merged.approvalMode, 'unrestricted');
    assert.equal(mutated, true);
  });

  it('soma allow/deny do template sem remover os do usuário nem duplicar', () => {
    const existing = {
      permissions: { allow: ['Shell(make)'], deny: ['Shell(rm)', 'Shell(curl)'] },
    };
    const [merged] = mergeConfig(existing, template);
    const perms = merged.permissions as { allow: string[]; deny: string[] };
    assert.ok(perms.allow.includes('Shell(make)'));
    assert.ok(perms.allow.includes('Shell(ls)'));
    assert.ok(perms.deny.includes('Shell(curl)'));
    assert.ok(perms.deny.includes('Read(**/.env)'));
    assert.equal(perms.deny.filter((d) => d === 'Shell(rm)').length, 1);
  });

  it('é idempotente', () => {
    const [once] = mergeConfig({}, template);
    const [twice, mutated] = mergeConfig(once, template);
    assert.deepEqual(twice, once);
    assert.equal(mutated, false);
  });

  it('preserva chaves desconhecidas do usuário', () => {
    const [merged] = mergeConfig({ model: 'x', editor: { vimMode: true } }, template);
    assert.equal(merged.model, 'x');
    assert.deepEqual(merged.editor, { vimMode: true });
  });
});

describe('applyAutoConfig', () => {
  it('cria, depois reporta ok, e respeita --unrestricted', () => {
    const dir = tempDir();
    const config = join(dir, 'cli-config.json');
    assert.equal(applyAutoConfig(config, TEMPLATE_PATH), 'created');
    assert.equal(applyAutoConfig(config, TEMPLATE_PATH), 'ok');
    assert.equal(applyAutoConfig(config, TEMPLATE_PATH, { unrestricted: true }), 'merged');
    const saved = JSON.parse(readFileSync(config, 'utf-8')) as Record<string, unknown>;
    assert.equal(saved.approvalMode, 'unrestricted');
  });

  it('mantém unrestricted existente num configure sem flag', () => {
    const dir = tempDir();
    const config = join(dir, 'cli-config.json');
    writeFileSync(config, JSON.stringify({ approvalMode: 'unrestricted' }));
    applyAutoConfig(config, TEMPLATE_PATH);
    const saved = JSON.parse(readFileSync(config, 'utf-8')) as Record<string, unknown>;
    assert.equal(saved.approvalMode, 'unrestricted');
  });
});
