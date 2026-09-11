#!/usr/bin/env node
/**
 * Hook stop (usuário ~/.cursor): se o turno editou código, pede follow-up
 * para append no routing-log.jsonl — o usuário não precisa lembrar.
 * Se o agente já registrou (--source=agent) nos últimos minutos, não pede de novo.
 */
import { pathToFileURL } from 'node:url';
import { readRoutingLog } from './append-routing-log.js';

const CODE_EXT =
  /\.(ts|tsx|js|jsx|mjs|cjs|css|scss|sass|less|vue|svelte|sql|prisma|graphql|gql|json|yml|yaml|toml|mdc|ps1|sh)$/i;

/** Janela em que um append do agente conta como “já feito neste turno”. */
const RECENT_AGENT_LOG_MS = 15 * 60 * 1000;

type StopPayload = {
  status?: string;
  input?: unknown;
  transcript_path?: string;
  workspace_roots?: string[];
  edited_files?: string[];
  files?: string[];
  file_paths?: string[];
};

function collectPaths(payload: StopPayload): string[] {
  const out: string[] = [];
  for (const key of ['edited_files', 'files', 'file_paths'] as const) {
    const v = payload[key];
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string') out.push(item);
        else if (item && typeof item === 'object' && 'path' in item) {
          const p = (item as { path?: unknown }).path;
          if (typeof p === 'string') out.push(p);
        }
      }
    }
  }
  // shapes nested under input
  if (payload.input && typeof payload.input === 'object') {
    out.push(...collectPaths(payload.input as StopPayload));
  }
  return out;
}

function projectFromRoots(roots: string[] | undefined): string | null {
  if (!roots?.length) return null;
  return roots[0] ?? null;
}

function buildFollowup(project: string | null): string {
  const projectFlag = project ? ` --project="${project.replace(/"/g, '')}"` : '';
  return [
    'Shared AI — routing log: este turno editou código.',
    'Append **uma linha** no log de roteamento com as skills que você de fato usou neste turno (orquestrador).',
    'Rode na raiz do clone shared-ai (ou com SHARED_AI_ROOT):',
    '',
    '```bash',
    `npx tsx packages/cursor/scripts/lib/routing/append-routing-log.ts append --source=agent --skills=skill1,skill2 --ask="resumo curto do pedido"${projectFlag}`,
    '```',
    '',
    'Liste só as skills do merge final (≤8). Não implemente mais código neste follow-up — só o log.',
  ].join('\n');
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<number> {
  const raw = await readStdin();
  let payload: StopPayload = {};
  try {
    payload = raw.trim() ? (JSON.parse(raw) as StopPayload) : {};
  } catch {
    process.stdout.write(`${JSON.stringify({ followup_message: '' })}\n`);
    return 0;
  }

  const paths = collectPaths(payload);
  const codeTouched = paths.some((p) => CODE_EXT.test(p));
  if (!codeTouched) {
    process.stdout.write(`${JSON.stringify({ followup_message: '' })}\n`);
    return 0;
  }

  const project = projectFromRoots(payload.workspace_roots);
  const cutoff = Date.now() - RECENT_AGENT_LOG_MS;
  const alreadyLogged = readRoutingLog(1).some((row) => {
    if (row.source !== 'agent') return false;
    const t = Date.parse(row.ts);
    if (Number.isNaN(t) || t < cutoff) return false;
    if (!project) return true;
    return !row.project || row.project === project;
  });
  if (alreadyLogged) {
    process.stdout.write(`${JSON.stringify({ followup_message: '' })}\n`);
    return 0;
  }

  process.stdout.write(
    `${JSON.stringify({ followup_message: buildFollowup(project) })}\n`,
  );
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().then((code) => process.exit(code));
}
