# Roteamento — complemento do projeto (monorepo)

Perfil: `monorepo` (`npm run bootstrap -- <repo> --profile=monorepo`).

Complementa `~/.cursor/SKILLS-ROUTING.md`.

## Stack

- Workspace npm/pnpm/yarn — `package.json#workspaces`, `pnpm-workspace.yaml`, ou pastas `packages/*` / `apps/*`
- Cada pacote pode ter stack própria (Next, Nest, React, libs TS)

## Skills priorizadas

| Skill | Reforçar quando |
| --- | --- |
| `typescript` | libs e apps TS no workspace |
| `nestjs` | pacote com `@nestjs/core` |
| `next` / `react` | apps front no workspace |
| `fsd-architecture` | app front com FSD |
| `docker` / `docker-compose` | compose na raiz do monorepo |
| `ci-cd` | workflows que buildam vários pacotes |
| `env-secrets` | `.env` por pacote — não misturar secrets |
| `testing` | testes no pacote tocado, não “no monorepo inteiro” sem escopo |

## Roteamento por pacote

1. Identificar **qual pacote** a tarefa altera (`apps/web`, `packages/api`, …).
2. Ler o `package.json` **desse** pacote para stack (não só a raiz).
3. Preferir skills do stack do pacote; raiz só para tooling compartilhado (eslint, tsconfig base, CI).
4. Mudança cross-package: declarar contratos (API pública / types) antes de editar os dois lados.

## Rule do projeto

- `.cursor/rules/monorepo-project.mdc` — editável e versionável neste repo
