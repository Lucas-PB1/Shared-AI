/** Glob simples e match de escopo (convencoes / exclusions). */

export function matchGlob(glob: string, filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const pattern = glob.trim();
  if (!pattern || pattern === "**/*" || pattern === "*") return true;

  const regexSource = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");

  return new RegExp(`^${regexSource}$`).test(normalized);
}

/**
 * Casa rótulo de escopo em convencoes.md / exclusions com path relativo do arquivo.
 */
export function scopeMatchesFile(scopeLabel: string, filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const scope = scopeLabel.trim();
  if (!scope) return false;

  const parenGlob = scope.match(/\(\*\*\/[^)]+\)/);
  if (parenGlob && matchGlob(parenGlob[0].slice(1, -1), normalized)) {
    return true;
  }

  if (scope === "**/*" || scope === "*") return true;
  if (scope.endsWith("/**")) {
    return normalized.startsWith(scope.slice(0, -3));
  }
  if (matchGlob(scope, normalized)) return true;
  if (normalized === scope || normalized.endsWith(`/${scope}`)) return true;

  return normalized.includes(scope);
}
