#!/usr/bin/env tsx
/**
 * Exporta exclusions versionáveis a partir de context.yaml.
 * Uso: review-export-exclusions.ts [project-dir]
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { loadContext, reviewDir } from "../src/memory/index.js";

function yamlEscape(s: string): string {
  if (/[:{}[\]&*#?|<>=!%@`]/.test(s) || s.includes("\n")) {
    return JSON.stringify(s);
  }
  return s;
}

function main(): number {
  const project = path.resolve(process.argv[2] || ".");
  const contextPath = path.join(reviewDir(project), "context.yaml");
  const outPath = path.join(reviewDir(project), "exclusions.yaml");

  if (!existsSync(contextPath)) {
    console.error(`Erro: ${contextPath} não encontrado.`);
    console.error("Rode no projeto com memória v2 ou crie exclusions.yaml manualmente.");
    return 1;
  }

  const data = loadContext(reviewDir(project)) || {};
  const raw = (data.exclusions as Array<Record<string, unknown>>) || [];
  const items: Array<Record<string, string>> = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const decision = String(item.decision ?? "").trim();
    if (decision !== "rejeitado" && decision !== "nao-aplicavel") continue;
    const reason = String(item.reason ?? "").trim();
    if (!reason) continue;
    const entry: Record<string, string> = {
      scope: String(item.scope ?? "**/*"),
      decision,
      reason,
    };
    if (item.id) entry.id = String(item.id);
    items.push(entry);
  }

  const lines = [
    "# Exclusões versionadas — usadas pelo /avaliar automático (CI)",
    "# Gerado por: review-export-exclusions a partir de context.yaml",
    "# Promover: rode export após /memoria compactar e commit deste arquivo.",
    "",
    "exclusions:",
  ];
  if (items.length === 0) {
    lines.push("  []");
  } else {
    for (const e of items) {
      lines.push(`  - scope: ${yamlEscape(e.scope)}`);
      lines.push(`    decision: ${e.decision}`);
      lines.push(`    reason: ${yamlEscape(e.reason)}`);
      if (e.id) lines.push(`    id: ${yamlEscape(e.id)}`);
    }
  }
  lines.push("");

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`Exportado: ${outPath} (${items.length} exclusões)`);
  return 0;
}

process.exit(main());
