/**
 * Helpers compartilhados de merge de hooks (shared-ai / historico).
 * Platform support: win32 | linux only.
 */

const PS1_PREFIX = 'powershell -NoProfile -ExecutionPolicy Bypass -File ';

export function platformHookCommand(unixRel: string, winRel: string): string {
  return process.platform === 'win32' ? `${PS1_PREFIX}${winRel}` : unixRel;
}

export type HookCmdMatcher = {
  markers: readonly string[];
  unixCommand: string;
  /** Substrings that mark a unix-style script of this hook (on Windows = wrong OS). */
  unixScriptHints?: readonly string[];
};

export function isMarkedCommand(cmd: unknown, markers: readonly string[]): cmd is string {
  return typeof cmd === 'string' && markers.some((m) => cmd.includes(m));
}

export function isWrongOsHookCommand(cmd: string, match: HookCmdMatcher): boolean {
  if (!isMarkedCommand(cmd, match.markers)) return false;
  const lower = cmd.toLowerCase();
  if (process.platform === 'win32') {
    if (cmd.trim() === match.unixCommand) return true;
    for (const hint of match.unixScriptHints ?? []) {
      if (!cmd.includes(hint)) continue;
      if (lower.includes('powershell')) continue;
      // script unix (ex. ensure-project-cursor.sh) vs hint genérico
      if (hint.endsWith('.sh') || cmd.endsWith('.sh')) return true;
    }
    return false;
  }
  return cmd.includes('.ps1') || lower.includes('powershell');
}

export function hookCommandOf(entry: unknown): string {
  if (typeof entry !== 'object' || entry === null) return '';
  const cmd = (entry as { command?: unknown }).command ?? '';
  return typeof cmd === 'string' ? cmd : '';
}

/** Remove entradas do hook com command "errado" para o OS atual. */
export function stripWrongOsHookEntries(
  list: unknown[],
  match: HookCmdMatcher,
): boolean {
  let mutated = false;
  const kept: unknown[] = [];
  for (const entry of list) {
    const cmd = hookCommandOf(entry);
    if (cmd && isWrongOsHookCommand(cmd, match)) {
      mutated = true;
      continue;
    }
    kept.push(entry);
  }
  list.splice(0, list.length, ...kept);
  return mutated;
}

export function hasMatchingHookEntry(
  list: unknown[],
  match: HookCmdMatcher,
): boolean {
  for (const entry of list) {
    const cmd = hookCommandOf(entry);
    if (cmd && isMarkedCommand(cmd, match.markers) && !isWrongOsHookCommand(cmd, match)) {
      return true;
    }
  }
  return false;
}

export function removeMarkedHookEntries(
  list: unknown[],
  markers: readonly string[],
): boolean {
  let mutated = false;
  const kept: unknown[] = [];
  for (const entry of list) {
    if (isMarkedCommand(hookCommandOf(entry), markers)) {
      mutated = true;
      continue;
    }
    kept.push(entry);
  }
  list.splice(0, list.length, ...kept);
  return mutated;
}

export function bumpAction(action: string, whenOk: 'merged' = 'merged'): string {
  return action === 'ok' ? whenOk : action;
}
