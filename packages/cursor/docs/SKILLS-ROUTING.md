# Roteamento de skills

> **Repositório:** `packages/cursor/docs/SKILLS-ROUTING.md` → após `npm run setup:skills` vira `~/.cursor/SKILLS-ROUTING.md`.

Skills genéricas em **`~/.cursor/skills/`** (fonte: `skills/` neste repo). Rules orquestradoras em **`~/.cursor/rules/`** (fonte: `rules/`), ligadas a cada projeto via symlink. Mapa: este arquivo.

Skills **do projeto** (se existirem) em `.cursor/skills/<nome>/` **sobrescrevem** o pacote do usuário.

## Camadas

| Camada | Rule | Sinal |
| --- | --- | --- |
| Intent | `intent.mdc` | palavras do pedido |
| Stack | `stack.mdc` | `package.json`, `composer.json`, `tsconfig`, `hsproject.json` |
| Contexto | rules glob | arquivos abertos ou no diff |

Merge, dedupe e cap (6–8 skills): `base.mdc`.

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
| `vertical-slice` | sim | — | arquitetura |
| `domain-driven-design` | sim | — | arquitetura |
| `repository` | sim | — | arquitetura |
| `hexagonal-architecture` | sim | — | arquitetura |
| `layered-architecture` | sim | — | arquitetura |
| `clean-architecture` | sim | — | arquitetura |
| `atomic-design` | sim | — | arquitetura; react-ui |
| `html` | sim | — | web-markup-styles |
| `css` | sim | tailwind | web-markup-styles; react-ui |
| `mobile-first` | sim | tailwind | web-markup-styles; react-ui |
| `accessibility` | sim | — | react-ui (UI); testing |
| `ux` | sim | — | react-ui (UI) |
| `security` | sim | — | web-markup-styles |
| `javascript` | sim | sim | typescript-javascript |
| `typescript` | sim | sim | typescript-javascript |
| `php` | — | sim | php-stack |
| `laravel` | — | sim | php-stack |
| `zend-laminas` | — | sim | php-stack |
| `python` | sim | sim | python-stack |
| `next` | sim (restrito) | sim | react-ui |
| `react` | sim | sim | react-ui |
| `tailwind` | sim | sim | react-ui; web-markup-styles |
| `motion` | sim | sim | react-ui |
| `testing` | sim | sim | testing |
| `eslint` | sim | sim | — |
| `prettier` | sim | sim | — |
| `git` | sim | — | — |
| `hubspot-cli` | deploy/CLI, HubSpot, `hs project` | hsproject / cms-components / `@hubspot/cli` | hubspot |
| `okf` | OKF, knowledge bundle, concept document | — | okf |
| `review-inbox` | `/avaliar`, `/avaliar-diff`, `/finalizar`, arquivo no repo (se code-review instalado) | — | — |
| `review`, `review-bugbot`, `review-security` | review PR/diff (se code-review instalado) | — | — |

> Skills `review-*` exigem `npm run setup:code-review`. Sem o pacote, review cai em tier 2 + `eslint`, `prettier`, `testing` + stack.

## Rules glob (no projeto)

| Rule | Glob |
| --- | --- |
| `typescript-javascript.mdc` | `*.{ts,tsx,js,mjs,cjs}` |
| `react-ui.mdc` | `*.{tsx,jsx}` |
| `web-markup-styles.mdc` | `*.{html,css,scss,blade.php}` |
| `php-stack.mdc` | `*.{php,blade.php}` |
| `python-stack.mdc` | `*.{py,pyi}` |
| `arquitetura.mdc` | `*.{ts,tsx,js,php,py}` |
| `testing.mdc` | `*.{test,spec}.*`, `tests/**` |
| `hubspot.mdc` | `hsproject.json`, `*.fields.json`, `hubspot.config.yml` |
| `okf.mdc` | `okf/**/*.md`, `.okf/**/*.md`, `okf-bundle/**/*.md` |

## Always-on (orquestrador)

Em `~/.cursor/rules/` — ligadas ao projeto via symlink:

- `base.mdc`
- `intent.mdc`
- `stack.mdc`

Mais rules glob (react-ui, testing, …) no mesmo diretório.
