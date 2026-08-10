# Perfis de bootstrap

Aplicados com:

```bash
npm run bootstrap -- /caminho/do/repo --profile=laravel
npm run onboard                              # wizard interativo (escolhe perfil)
```

| Perfil | Stack detectada |
| --- | --- |
| `laravel` | `composer.json` → `laravel/framework` |
| `hubspot` | `hsproject.json`, `@hubspot/*` |
| `react` | `package.json` → `react` / `react-dom` |
| `next` | `package.json` → `next` |
| `python` | `pyproject.toml`, `requirements.txt`, `setup.py` |
| `zend-laminas` | `composer.json` → `laminas/*`, `zendframework/*` |

Detecção automática: `packages/cursor/scripts/lib/profiles/detect-stack.ts` (usado por `/onboard`).

Cada perfil cria **somente se não existir**:

| Arquivo | Descrição |
| --- | --- |
| `.cursor/SKILLS-ROUTING.md` | Complemento de roteamento do projeto |
| `.cursor/rules/*-project.mdc` | Rule versionável (não symlink) |

Arquivos reais do projeto **nunca são sobrescritos**.
