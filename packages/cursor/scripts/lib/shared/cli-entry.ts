/**
 * Detecção de entrypoint CLI ESM (tsx/node).
 */
import { pathToFileURL } from 'node:url';

export function isCliMain(metaUrl: string, argv1 = process.argv[1]): boolean {
  if (!argv1) return false;
  return metaUrl === pathToFileURL(argv1).href;
}

export function runCliMain(metaUrl: string, main: () => number): void {
  if (isCliMain(metaUrl)) {
    process.exit(main());
  }
}
