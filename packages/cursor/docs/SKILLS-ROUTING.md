# Roteamento de skills

> **Repositório:** `packages/cursor/docs/SKILLS-ROUTING.md` → após `npm run setup:skills` vira `~/.cursor/SKILLS-ROUTING.md`.

Skills genéricas em **`~/.cursor/skills/`** (fonte: `skills/` neste repo). Rules orquestradoras em **`~/.cursor/rules/`** e commands do Shared AI em **`~/.cursor/commands/`** — globais no usuário, sem symlink por projeto. Mapa: este arquivo.

Skills **do projeto** (se existirem) em `.cursor/skills/<nome>/` **sobrescrevem** o pacote do usuário.

## Camadas

| Camada | Rule | Sinal |
| --- | --- | --- |
| Intent | `intent.mdc` | palavras do pedido |
| Stack | `stack.mdc` | `package.json`, `composer.json`, `tsconfig` |
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
| `docker` | docker, container, Dockerfile, imagem | `Dockerfile`, `.dockerignore` | devops |
| `docker-compose` | compose, serviços locais | `docker-compose*.yml`, `compose*.yml` | devops |
| `ci-cd` | pipeline, CI/CD, GitHub Actions, GitLab CI | workflows, `.gitlab-ci.yml` | devops |
| `shell-scripting` | bash, shell script, `.sh` | `*.sh`, `*.bash` | devops |
| `env-secrets` | env, `.env`, segredo, 12-factor | — | devops |
| `linux-server` | systemd, cron, servidor Linux, permissões | `*.service`, `*.timer` | devops |
| `nginx` | nginx, reverse proxy, TLS | `nginx*.conf`, `sites-available/**` | devops |
| `observability` | log, métrica, health check, readiness | — | devops |
| `deployment-strategies` | zero-downtime, blue-green, canary, rollback | — | devops |
| `infrastructure-as-code` | Terraform, IaC, state, provisionar | `*.tf`, `*.tfvars` | devops |
| `okf` | OKF, knowledge bundle, concept document | — | okf |

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
| `devops.mdc` | `Dockerfile*`, `docker-compose*.yml`, `.github/workflows/*.yml`, `.gitlab-ci.yml`, `*.tf`, `*.sh`, `nginx*.conf`, `*.service` |
| `okf.mdc` | `okf/**/*.md`, `.okf/**/*.md`, `okf-bundle/**/*.md` |

## Always-on (orquestrador)

Em `~/.cursor/rules/` (global; Cursor inclui a pasta home no contexto):

- `base.mdc`
- `intent.mdc`
- `stack.mdc`

Mais rules glob (react-ui, testing, …) no mesmo diretório. Rules do projeto (`*-project.mdc`, history-watch) ficam só em `.cursor/rules/` do repo.
