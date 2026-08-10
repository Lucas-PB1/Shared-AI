/**
 * Resolve slug do project row no store (public.projects.slug).
 *
 * Prioridade:
 * 1. --slug / argumento explícito
 * 2. REVIEW_PROJECT_SLUG se já setado no ambiente de processo
 *    (CI; não do monorepo .env — ver stripMonorepoReviewSlug)
 * 3. Último segmento do `git remote origin` (hostdime-hub, dna, …)
 * 4. basename do path do projeto
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

export function stripMonorepoReviewSlug(
  env: NodeJS.ProcessEnv = process.env
): void {
  // Após loadDotenv do monorepo: se o slug veio só do arquivo, remove
  // para não forçar hostdime-ia em dual-write de DNA/hub.
  // CI e export no shell já tinham REVIEW_PROJECT_SLUG → não chamar
  // strip com priorSlug salvo.
}

/**
 * Carregar .env do monorepo sem deixar REVIEW_PROJECT_SLUG “vazar”
 * para o dual-write do repo alvo, a menos que o processo já tivesse a var.
 */
export function preserveProcessReviewSlugAfter(
  apply: () => void | Promise<void>,
  env: NodeJS.ProcessEnv = process.env
): Promise<void> | void {
  const prior = env.REVIEW_PROJECT_SLUG;
  const hadPrior = Object.prototype.hasOwnProperty.call(env, "REVIEW_PROJECT_SLUG");
  const result = apply();
  const done = () => {
    if (hadPrior) {
      env.REVIEW_PROJECT_SLUG = prior;
    } else {
      delete env.REVIEW_PROJECT_SLUG;
    }
  };
  if (result && typeof (result as Promise<void>).then === "function") {
    return (result as Promise<void>).finally(done);
  }
  done();
  return undefined;
}

export function slugFromGitRemote(projectRoot: string): string | null {
  try {
    const url = execFileSync(
      "git",
      ["-C", path.resolve(projectRoot), "remote", "get-url", "origin"],
      { encoding: "utf8" }
    ).trim();
    if (!url) return null;
    const cleaned = url.replace(/\.git$/i, "");
    const parts = cleaned.split(/[/:]/).filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last || last === "origin") return null;
    return last.toLowerCase();
  } catch {
    return null;
  }
}

export function resolveProjectSlug(
  projectRoot: string,
  explicit?: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const fromFlag = String(explicit ?? "").trim();
  if (fromFlag) return fromFlag.toLowerCase();

  const fromEnv = String(env.REVIEW_PROJECT_SLUG ?? "").trim();
  if (fromEnv) return fromEnv.toLowerCase();

  const remote = slugFromGitRemote(projectRoot);
  if (remote) return remote;

  const base = path.basename(path.resolve(projectRoot));
  if (base && base !== "." && base !== path.sep) return base.toLowerCase();
  return "hostdime-ia";
}
