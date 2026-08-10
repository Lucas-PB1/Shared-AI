#!/usr/bin/env node
/**
 * Seletor sync-inbox em cards — leitura confortável de resumos longos.
 * GTK não está disponível em Node puro; usa zenity quando DISPLAY está setado.
 * Exit 2 quando GUI indisponível (equivalente ao ImportError do gi no Python).
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

interface InboxItem {
  path: string;
  name: string;
  branch?: string;
  changedCount?: number;
  summary?: string;
  objective?: string;
  detail?: string;
}

function loadItems(inbox: string): InboxItem[] {
  if (!existsSync(inbox)) return [];
  const data = JSON.parse(readFileSync(inbox, 'utf-8')) as { items?: InboxItem[] };
  return data.items ?? [];
}

function canGui(): boolean {
  if (!process.env.DISPLAY) return false;
  const proc = spawnSync('which', ['zenity'], { encoding: 'utf-8' });
  return proc.status === 0;
}

function pickWithZenity(items: InboxItem[]): string | null {
  const cmd = [
    'zenity',
    '--list',
    '--title=HostDime — O que retomar?',
    '--text=Escolha o projeto para continuar no Cursor:',
    '--column=Projeto',
    '--column=Resumo',
    '--column=Path',
    '--hide-column=3',
    '--width=720',
    '--height=480',
  ];

  for (const it of items) {
    const summary = it.summary ?? it.objective ?? '';
    const detail =
      it.detail ?? `${it.branch ?? ''} · ${it.changedCount ?? 0} arq.`;
    let card = summary;
    if (detail) card += `\n${detail}`;
    cmd.push(it.name, card.slice(0, 320), it.path);
  }

  const proc = spawnSync(cmd[0]!, cmd.slice(1), { encoding: 'utf-8' });
  if (proc.status !== 0 || !proc.stdout?.trim()) return null;
  const parts = proc.stdout.trim().split('\t');
  return parts[parts.length - 1] ?? null;
}

function main(): number {
  const inbox =
    process.argv.length > 2
      ? process.argv[2]!
      : join(homedir(), '.cursor/hostdime-ia/sync-inbox.json');

  const items = loadItems(inbox);
  if (items.length === 0) return 0;

  if (!canGui()) return 2;

  const path = pickWithZenity(items);
  if (path) process.stdout.write(`${path}\n`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}
