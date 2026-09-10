# Roteamento de skills

> **Repositório:** `packages/cursor/docs/SKILLS-ROUTING.md` → após `npm run setup:skills` vira `~/.cursor/SKILLS-ROUTING.md`.

Skills genéricas em **`~/.cursor/skills/`** (fonte: `skills/` neste repo). Rules orquestradoras em **`~/.cursor/rules/`** e commands do Shared AI em **`~/.cursor/commands/`** — globais no usuário, sem symlink por projeto. Mapa: este arquivo.

Skills **do projeto** (se existirem) em `.cursor/skills/<nome>/` **sobrescrevem** o pacote do usuário.

Escopo: TypeScript / Next / React / Nest / Supabase / Docker / CI (DND Work + dashboard Shared AI).

## Camadas

| Camada | Rule | Sinal | alwaysApply |
| --- | --- | --- | --- |
| Protocolo | `base.mdc` | merge, tiers, cap, paths | sim |
| Intent | `intent.mdc` | palavras do pedido | sim |
| Stack | `stack.mdc` | manifestos do repo | sim |
| Contexto | rules com `globs` | arquivos abertos / no diff | não |

Merge, dedupe e cap (6–8 skills): `base.mdc`. Rules de contexto **só roteiam** — o conteúdo fica na skill.

## Localização ao ler arquivos

1. `.cursor/skills/<nome>/SKILL.md` (projeto)
2. `~/.cursor/skills/<nome>/SKILL.md` (usuário)

## Skill → gatilhos

| Skill | Intent | Stack | Glob |
| --- | --- | --- | --- |
| `clean-code` | — | — | base tier 1 |
| `dry` | — | — | base tier 2 |
| `solid` | arquitetura | — | base tier 2; arquitetura |
| `no-magic-numbers` | — | — | base tier 2 |
| `domain-driven-design` | sim | — | arquitetura |
| `fsd-architecture` | sim | — | arquitetura; react-ui |
| `html` | sim | — | web-markup-styles |
| `css` | sim | tailwind | web-markup-styles; react-ui |
| `mobile-first` | sim | tailwind | web-markup-styles; react-ui |
| `accessibility` | sim | — | react-ui (UI); testing |
| `ux` | sim | — | react-ui (UI) |
| `security` | sim | — | web-markup-styles |
| `javascript` | sim | sim | typescript-javascript |
| `typescript` | sim | sim | typescript-javascript |
| `next` | sim (restrito) | sim | react-ui |
| `react` | sim | sim | react-ui |
| `tailwind` | sim | sim | react-ui; web-markup-styles |
| `ui-shadcn` | sim | shadcn / CVA | react-ui |
| `forms-rhf-zod` | sim | RHF / zod | react-ui |
| `tanstack-query` | sim | `@tanstack/react-query` | react-ui |
| `nestjs` | sim | `@nestjs/core` | — |
| `typeorm` | sim | `typeorm` | — |
| `supabase` | sim | `@supabase/*` | — |
| `postgresql-sql` | sim | `.sql` / migrations | devops |
| `vercel` | sim | `vercel.json` | devops |
| `testing` | sim | vitest/jest/cypress | testing |
| `eslint` | sim | sim | — |
| `prettier` | sim | sim | — |
| `git` | sim | — | — |
| `docker` | docker, container, Dockerfile | `Dockerfile` | devops |
| `docker-compose` | compose | `docker-compose*.yml` | devops |
| `ci-cd` | pipeline, CI/CD | workflows | devops |
| `shell-scripting` | bash, `.sh` | `*.sh` | devops |
| `env-secrets` | env, segredo | — | devops |
| `history-watch` | historico, watches | — | history-watch |
| `okf` | OKF, knowledge bundle | — | okf |

## Rules glob (contexto)

| Rule | Glob | Responsabilidade |
| --- | --- | --- |
| `typescript-javascript.mdc` | `*.{ts,tsx,js,mjs,cjs}` | TS vs JS |
| `react-ui.mdc` | `*.{tsx,jsx}` | React / Next / UI |
| `web-markup-styles.mdc` | `*.{html,css,scss}` | markup / CSS |
| `arquitetura.mdc` | `*.{ts,tsx,js,…}` | DDD / FSD / Nest |
| `testing.mdc` | testes / cypress | framework de teste |
| `devops.mdc` | Docker, CI, vercel, sql, sh | ops |
| `okf.mdc` | `okf/**/*.md`, `docs/okf/**` | knowledge bundle |
| `history-watch.mdc` | `.cursor/history/**`, watches | histórico de escopo |

## Always-on

- `base.mdc` — protocolo
- `intent.mdc` — palavras
- `stack.mdc` — manifestos

Rules do projeto (`*-project.mdc`, `history-watch-*.mdc`) ficam só em `.cursor/rules/` do repo.
