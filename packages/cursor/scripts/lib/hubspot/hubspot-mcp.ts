#!/usr/bin/env node
/** Estado/merge do MCP HubSpotDev em mcp.json. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const HUBSPOT_KEYS = new Set(['hubspotdev', 'hubspot']);

const HUBSPOT_ENTRY = {
  HubSpotDev: {
    command: 'npx',
    args: ['-y', '-p', '@hubspot/cli', 'hs', 'mcp', 'start', '--ai-agent', 'cursor'],
    env: { HUBSPOT_MCP_STANDALONE: 'true' },
  },
} as const;

function isConfigured(path: string): number {
  if (!existsSync(path)) return 1;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as {
      mcpServers?: Record<string, unknown>;
    };
    const servers = data.mcpServers ?? {};
    for (const key of Object.keys(servers)) {
      if (HUBSPOT_KEYS.has(key.toLowerCase())) return 0;
    }
    return 1;
  } catch {
    return 1;
  }
}

function merge(path: string): number {
  let data: Record<string, unknown> = { mcpServers: {} };
  if (existsSync(path)) {
    try {
      data = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
    } catch (err) {
      process.stderr.write(`Erro: ${path} não é JSON válido (${err})\n`);
      return 1;
    }
  }
  const servers = (data.mcpServers as Record<string, unknown> | undefined) ?? {};
  data.mcpServers = servers;
  for (const key of Object.keys(servers)) {
    if (HUBSPOT_KEYS.has(key.toLowerCase())) delete servers[key];
  }
  Object.assign(servers, HUBSPOT_ENTRY);
  mkdirSync(dirname(path) || '.', { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  return 0;
}

function usage(): void {
  process.stderr.write('Uso: hubspot-mcp.ts configured|merge <mcp.json>\n');
}

function main(): number {
  const [cmd, file] = process.argv.slice(2);
  if (!cmd || !file) {
    usage();
    return 2;
  }
  switch (cmd) {
    case 'configured':
      return isConfigured(file);
    case 'merge':
      return merge(file);
    default:
      usage();
      return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main());
}
