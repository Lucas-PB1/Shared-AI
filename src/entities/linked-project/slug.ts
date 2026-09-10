import { createHash } from 'node:crypto';
import { basename } from 'node:path';

/** Slug estável a partir do path (basename + hash curto). */
export function slugFromPath(projectPath: string): string {
  const base =
    basename(projectPath)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'projeto';
  const hash = createHash('sha1').update(projectPath).digest('hex').slice(0, 8);
  return `${base}-${hash}`;
}
