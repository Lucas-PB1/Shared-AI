#!/usr/bin/env node
/**
 * Reescreve body de uma convention fraca (heurística) via Cursor agent.
 *
 * Uso:
 *   npx tsx packages/code-review/bin/review-rewrite-convention-body.ts \
 *     --cloud --id ea71335d-eb1c-46e6-841f-d5baa0dcba52 --write
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ReviewStore,
  loadConfig,
  loadDotenvFile,
} from "../src/store/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");

function parseArgs(argv: string[]) {
  let cloud = false;
  let write = false;
  let id: string | null = null;
  let slug: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cloud") cloud = true;
    else if (a === "--write") write = true;
    else if (a === "--id" && argv[i + 1]) id = argv[++i];
    else if (a === "--slug" && argv[i + 1]) slug = argv[++i];
  }
  return { cloud, write, id, slug };
}

function callAgent(prompt: string): string {
  const agent =
    process.env.CURSOR_AGENT_BIN?.trim() ||
    ["agent", "cursor"]
      .map((c) => {
        const r = spawnSync("which", [c], { encoding: "utf8" });
        return r.status === 0 ? r.stdout.trim().split("\n")[0] : "";
      })
      .find(Boolean) ||
    "agent";
  const env = { ...process.env };
  // Prefer logged-in agent session in CI-less local runs.
  delete env.CURSOR_API_KEY;
  const result = spawnSync(agent, ["-p", "--force", prompt], {
    encoding: "utf8",
    env,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `agent failed (${String(result.status)}): ${result.stderr || result.stdout}`
    );
  }
  return String(result.stdout ?? "").trim();
}

function extractJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) return JSON.parse(fence[1].trim()) as Record<string, unknown>;
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error("resposta não é JSON");
  }
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.id) {
    console.error("Informe --id <convention-uuid>");
    return 1;
  }
  await loadDotenvFile(path.join(monorepoRoot, ".env"));
  await loadDotenvFile(path.join(process.cwd(), ".env"));

  const env = { ...process.env };
  if (args.cloud) {
    const url = String(env.SUPABASE_CLOUD_URL ?? "").trim();
    const secret = String(env.SUPABASE_CLOUD_SECRET_KEY ?? "").trim();
    if (!url || !secret) {
      console.error("Cloud: SUPABASE_CLOUD_URL / SUPABASE_CLOUD_SECRET_KEY");
      return 1;
    }
    env.SUPABASE_URL = url;
    env.SUPABASE_SECRET_KEY = secret;
    env.SUPABASE_SERVICE_ROLE_KEY = secret;
  } else {
    const localUrl = String(env.SUPABASE_LOCAL_URL ?? "").trim();
    const localKey = String(env.SUPABASE_LOCAL_SECRET_KEY ?? "").trim();
    if (localUrl) env.SUPABASE_URL = localUrl;
    if (localKey) {
      env.SUPABASE_SECRET_KEY = localKey;
      env.SUPABASE_SERVICE_ROLE_KEY = localKey;
    }
  }

  const slug = args.slug ?? env.REVIEW_PROJECT_SLUG ?? "hostdime-hub";
  const store = new ReviewStore(loadConfig({ env, projectSlug: slug }));
  const projectId = await store.getProjectId();
  const rows = await store.listConventions(projectId, { limit: 500 });
  const row = rows.find((r) => String(r.id) === args.id);
  if (!row) {
    console.error(`Convention ${args.id} não encontrada em ${slug}`);
    return 1;
  }

  const meta =
    row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
      ? (row.meta as Record<string, unknown>)
      : {};
  const decisions = await store.listDecisions(projectId, { limit: 500 });
  const ids = Array.isArray(meta.evidence_decision_ids)
    ? meta.evidence_decision_ids.map((x) => String(x))
    : [];
  const evidence = decisions.filter((d) => ids.includes(String(d.id ?? "")));

  const prompt = [
    "Reescreva o body de uma convention de code-review para ser uma regra durável e reutilizável.",
    "Não copie o texto do finding/comentário de PR. Remova tom de conversa (\"resolvido!\", \"essas pastas\").",
    "body: 1–3 frases imperativas em PT-BR (quando aplica / o que fazer ou não fazer).",
    "scope_glob: o glob mais justo para onde a regra vale.",
    "Responda SOMENTE JSON: {\"body\":\"...\",\"scope_glob\":\"...\",\"rationale\":\"...\"}",
    "",
    "CONVENTION_ATUAL:",
    JSON.stringify(
      {
        id: row.id,
        finding_key: row.finding_key,
        body: row.body,
        scope_glob: row.scope_glob,
        meta,
      },
      null,
      2
    ),
    "",
    "EVIDENCIA_DECISIONS:",
    JSON.stringify(
      evidence.map((d) => ({
        finding_key: d.finding_key,
        summary: d.summary,
        file_path: d.file_path,
        source: d.source,
        reason: d.reason,
      })),
      null,
      2
    ),
  ].join("\n");

  console.log("→ chamando agent para reescrever body…");
  const raw = callAgent(prompt);
  const parsed = extractJson(raw);
  const body = String(parsed.body ?? "").trim();
  const scopeGlob =
    String(parsed.scope_glob ?? row.scope_glob ?? "**/*").trim() || "**/*";
  if (!body) {
    console.error("LLM não devolveu body", raw.slice(0, 500));
    return 1;
  }

  console.log(
    JSON.stringify(
      {
        id: args.id,
        before: { body: row.body, scope: row.scope_glob },
        after: { body, scope: scopeGlob },
        rationale: parsed.rationale ?? null,
      },
      null,
      2
    )
  );

  if (!args.write) {
    console.log("Dry-run. Use --write para gravar.");
    return 0;
  }

  await store.upsertConvention(projectId, {
    id: String(row.id),
    body,
    scopeGlob,
    findingKey: row.finding_key != null ? String(row.finding_key) : null,
    occurrences: Number(row.occurrences ?? 1) || 1,
    source: row.source != null ? String(row.source) : "ci",
    meta: {
      ...meta,
      llm_promoted: true,
      llm_rewritten_at: new Date().toISOString(),
    },
  });
  console.log("Gravado.");
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
