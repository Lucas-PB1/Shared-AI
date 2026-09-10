# Perfis de bootstrap

Aplicados com:

```bash
npm run bootstrap -- /caminho/do/repo --profile=next
npm run bootstrap -- /caminho/do/repo --profile=monorepo
npm run onboard                              # wizard interativo (escolhe perfil)
```

| Perfil | Stack detectada |
| --- | --- |
| `monorepo` | `pnpm-workspace.yaml`, `workspaces`, `turbo.json`, `nx.json` |
| `nestjs` | `package.json` → `@nestjs/core` / `@nestjs/common` |
| `next` | `package.json` → `next` |
| `react` | `package.json` → `react` / `react-dom` |

Detecção automática: `packages/cursor/scripts/lib/profiles/ts/detect-stack.ts` (monorepo → Nest → Next → React).

Cada perfil cria **somente se não existir**:

| Arquivo | Descrição |
| --- | --- |
| `.cursor/SKILLS-ROUTING.md` | Complemento de roteamento do projeto |
| `.cursor/rules/*-project.mdc` | Rule versionável (não symlink) |

Arquivos reais do projeto **nunca são sobrescritos**.
