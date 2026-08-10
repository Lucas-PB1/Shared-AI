/**
 * Pull/push de exclusions e conventions entre store e .cursor/review/.
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { reviewDir } from "../memory/paths.js";
import type { LoadConfigOpts } from "./config.js";
import type { ReviewStorePort } from "./port.js";
import { STORE_REQUIRED_MSG, openStore } from "./open.js";
import {
  formatConventionsMd,
  formatExclusionsYaml,
  parseExclusionsYaml,
  rowToConvention,
  rowToExclusion,
  type StoreConvention,
  type StoreExclusion,
} from "./memory-format.js";

export async function fetchStoreMemory(
  opts: {
    port?: ReviewStorePort | null;
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    projectSlug?: string;
  } = {}
): Promise<{
  attempted: boolean;
  exclusions: StoreExclusion[];
  conventions: StoreConvention[];
  projectId?: string;
  error?: string;
}> {
  const port =
    opts.port === undefined
      ? openStore({ env: opts.env, projectSlug: opts.projectSlug })
      : opts.port;
  if (!port) {
    return {
      attempted: true,
      exclusions: [],
      conventions: [],
      error: STORE_REQUIRED_MSG,
    };
  }
  try {
    const projectId = await port.getProjectId(opts.projectSlug);
    const [exRows, convRows] = await Promise.all([
      port.listExclusions(projectId, { activeOnly: true }),
      port.listConventions(projectId),
    ]);
    return {
      attempted: true,
      projectId,
      exclusions: exRows.map(rowToExclusion).filter((e) => e.findingKey),
      conventions: convRows.map(rowToConvention).filter((c) => c.body),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      attempted: true,
      exclusions: [],
      conventions: [],
      error: msg,
    };
  }
}

export async function pullMemoryToProject(
  project: string,
  opts: LoadConfigOpts & {
    projectSlug?: string;
    port?: ReviewStorePort | null;
  } = {}
): Promise<{
  attempted: boolean;
  exclusionsPath?: string;
  conventionsPath?: string;
  exclusionCount: number;
  conventionCount: number;
  error?: string;
}> {
  const mem = await fetchStoreMemory({
    port: opts.port,
    env: opts.env,
    projectSlug: opts.projectSlug,
  });
  if (mem.error) {
    return {
      attempted: true,
      exclusionCount: 0,
      conventionCount: 0,
      error: mem.error,
    };
  }

  const rd = reviewDir(project);
  mkdirSync(rd, { recursive: true });
  const exclusionsPath = path.join(rd, "exclusions.yaml");
  const conventionsPath = path.join(rd, "convencoes-store.md");
  writeFileSync(exclusionsPath, formatExclusionsYaml(mem.exclusions), "utf8");
  writeFileSync(conventionsPath, formatConventionsMd(mem.conventions), "utf8");
  return {
    attempted: true,
    exclusionsPath,
    conventionsPath,
    exclusionCount: mem.exclusions.filter((e) => e.active).length,
    conventionCount: mem.conventions.length,
  };
}

export async function pushExclusionsFromProject(
  project: string,
  opts: {
    port?: ReviewStorePort | null;
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    projectSlug?: string;
    yamlPath?: string;
  } = {}
): Promise<{ attempted: boolean; written: number; error?: string }> {
  const port =
    opts.port === undefined
      ? openStore({ env: opts.env, projectSlug: opts.projectSlug })
      : opts.port;
  if (!port) {
    return { attempted: true, written: 0, error: STORE_REQUIRED_MSG };
  }

  const yamlPath =
    opts.yamlPath ?? path.join(reviewDir(project), "exclusions.yaml");
  if (!existsSync(yamlPath)) {
    return {
      attempted: true,
      written: 0,
      error: `arquivo ausente: ${yamlPath}`,
    };
  }

  const items = parseExclusionsYaml(readFileSync(yamlPath, "utf8"));
  try {
    const projectId = await port.getProjectId(opts.projectSlug);
    let written = 0;
    for (const item of items) {
      const key =
        item.id ||
        item.reason
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/[-\s]+/g, "-")
          .slice(0, 80) ||
        "exclusion";
      await port.upsertExclusion(projectId, {
        findingKey: key,
        reason: item.reason,
        scopeGlob: item.scope,
        active: true,
      });
      written += 1;
    }
    return { attempted: true, written };
  } catch (err) {
    return {
      attempted: true,
      written: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
