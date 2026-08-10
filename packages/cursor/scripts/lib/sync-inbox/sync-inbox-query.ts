#!/usr/bin/env node
/** Consultas leves sobre sync-inbox.json (count, format, path, notify, pick-zenity). */
import { existsSync, readFileSync } from 'node:fs';
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
  try {
    const data = JSON.parse(readFileSync(inbox, 'utf-8')) as { items?: InboxItem[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

function cmdCount(inbox: string): number {
  process.stdout.write(String(loadItems(inbox).length));
  return 0;
}

function cmdFormat(inbox: string): number {
  const items = loadItems(inbox);
  if (items.length === 0) {
    process.stdout.write('Nenhum projeto com alterações não commitadas.\n');
    return 0;
  }
  let out = `O que retomar — ${items.length} projeto(s)\n\n`;
  items.forEach((it, i) => {
    const summary = it.summary ?? it.objective ?? '';
    const detail = it.detail ?? '';
    out += `${i + 1}. ${it.name}\n`;
    out += `   → ${summary}\n`;
    if (detail) out += `   (${detail})\n`;
    out += '\n';
  });
  process.stdout.write(out);
  return 0;
}

function cmdNotifyBody(inbox: string): number {
  const items = loadItems(inbox);
  const lines: string[] = [];
  for (const it of items.slice(0, 3)) {
    let summary = it.summary ?? it.objective ?? '';
    if (summary.length > 70) summary = `${summary.slice(0, 69)}…`;
    lines.push(`• ${it.name}: ${summary}`);
  }
  if (items.length > 3) lines.push(`… +${items.length - 3} projeto(s)`);
  process.stdout.write(lines.join('\n'));
  return 0;
}

function cmdPath(inbox: string, choice: string): number {
  const idx = Number(choice) - 1;
  const items = loadItems(inbox);
  if (Number.isFinite(idx) && idx >= 0 && idx < items.length) {
    process.stdout.write(items[idx]!.path);
  }
  return 0;
}

function cmdPickZenity(inbox: string): number {
  const items = loadItems(inbox);
  if (items.length === 0) return 0;

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
  if (proc.status !== 0 || !proc.stdout?.trim()) return 0;
  const parts = proc.stdout.trim().split('\t');
  process.stdout.write(parts[parts.length - 1] ?? '');
  return 0;
}

function usage(): void {
  process.stderr.write(
    'Uso: sync-inbox-query.ts count|format|notify-body|path|pick-zenity <inbox> [choice]\n',
  );
}

function main(): number {
  const [cmd, inbox, choice] = process.argv.slice(2);
  if (!cmd || !inbox) {
    usage();
    return 2;
  }
  switch (cmd) {
    case 'count':
      return cmdCount(inbox);
    case 'format':
      return cmdFormat(inbox);
    case 'notify-body':
      return cmdNotifyBody(inbox);
    case 'path':
      if (!choice) {
        usage();
        return 2;
      }
      return cmdPath(inbox, choice);
    case 'pick-zenity':
      return cmdPickZenity(inbox);
    default:
      usage();
      return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}
