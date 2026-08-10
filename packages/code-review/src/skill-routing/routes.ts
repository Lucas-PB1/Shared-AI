/** Rotas de skill (hostdime + stack genérico) e hints quando o SKILL.md não existe. */

export type SkillRoute = {
  id: string;
  test: (file: string) => boolean;
  priority: number;
};

export const HOSTDIME_SKILL_ROUTES: SkillRoute[] = [
  {
    id: "hostdime-module-fields",
    priority: 10,
    test: (f) =>
      /Fields\.tsx$/i.test(f) ||
      (/\/defaults\.ts$/i.test(f) && f.includes("/components/modules/")),
  },
  {
    id: "hostdime-styling",
    priority: 12,
    test: (f) =>
      /\.(css|scss)$/i.test(f) ||
      /\/constants\/layout\.ts$/i.test(f) ||
      /\/styles\/[^/]+\.css$/i.test(f),
  },
  {
    id: "hostdime-chrome",
    priority: 20,
    test: (f) =>
      /\/components\/modules\/(SiteMenuMain|SiteFooter|LandingHeader|LandingFooter)\//.test(
        f,
      ),
  },
  {
    id: "hostdime-sections",
    priority: 21,
    test: (f) => /\/components\/modules\/Section[^/]+\//.test(f),
  },
  {
    id: "hostdime-seo-agent-ready",
    priority: 25,
    test: (f) =>
      /(?:schema|seo|json-ld|metadata|structured-data|open-graph|og-image)/i.test(
        f,
      ),
  },
  {
    id: "hostdime-lib-layers",
    priority: 30,
    test: (f) => f.includes("/components/lib/"),
  },
  {
    id: "hostdime-vertical-slice",
    priority: 40,
    test: (f) => f.includes("/components/modules/"),
  },
];

export const STACK_SKILL_ROUTES: SkillRoute[] = [
  { id: "react", priority: 50, test: (f) => /\.(tsx|jsx)$/i.test(f) },
  { id: "typescript", priority: 51, test: (f) => /\.(ts|tsx)$/i.test(f) },
  { id: "eslint", priority: 52, test: (f) => /\.(tsx?|jsx?|mjs|cjs)$/i.test(f) },
  {
    id: "testing",
    priority: 53,
    test: (f) => /\.(test|spec)\.(tsx?|jsx?)$/i.test(f),
  },
];

export const STACK_HINTS: Record<string, string> = {
  react:
    "React: hooks corretos, keys em listas, memoização só quando necessário, a11y em controles interativos, evitar estado derivado redundante.",
  typescript:
    "TypeScript: evitar any, narrowing explícito, tipos de props exportados, union discriminada quando aplicável.",
  eslint:
    "ESLint: corrigir violations reais; não sugerir desligar regras sem motivo.",
  testing:
    "Testes: RTL user-event, assert comportamento visível, evitar snapshot frágil, cobrir fluxos críticos.",
};
