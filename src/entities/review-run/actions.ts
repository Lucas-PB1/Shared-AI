'use server';

import { listRunDecisions } from '@/entities/project';
import type { Decision } from '@/entities/project';

export async function loadRunDecisions(runId: string): Promise<Decision[]> {
  return listRunDecisions(runId);
}
