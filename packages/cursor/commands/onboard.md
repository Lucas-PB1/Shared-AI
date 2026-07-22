# Onboarding HostDime IA (`/onboard`)

Wizard de **primeira configuração**: instala o pacote, escolhe perfil, faz bootstrap do projeto e oferece extras.

## Quando usar

- Primeira vez no hostdime-ia (dev novo no time)
- Novo repositório para vincular ao Cursor
- Substituir sequência manual do README por um fluxo guiado

## Fluxo

1. **setup:skills** — se ainda não instalado (orquestrador + commands em `~/.cursor/`)
2. **setup:code-review** — opcional (`/avaliar`, PHPStan, ESLint)
3. **Caminho do projeto** — diretório raiz do repo
4. **Perfil** — menu interativo ou detecção automática
5. **bootstrap** — `review/` + rule/SKILLS-ROUTING do perfil + registry (sem espelhar orquestrador/commands)
6. **Extras** — boot-sync, sync-inbox, Cursor CLI, MCP HubSpot (se perfil hubspot)

Máquina ainda no dual-link antigo: use `/migrar-cursor` (não este wizard).

## Perfis

| Perfil | Detectado quando |
| --- | --- |
| `laravel` | `laravel/framework` no composer |
| `hubspot` | `hsproject.json` ou `@hubspot/*` |
| `react` | `react` / `react-dom` no package.json |
| `next` | `next` no package.json |
| `python` | `pyproject.toml`, `requirements.txt`, `setup.py` |
| `zend-laminas` | `laminas/*` ou `zendframework/*` no composer |

Detecção: `packages/cursor/scripts/lib/detect-stack.py`.  
Menu lista todos em `packages/cursor/profiles/`.  
Opção **s** = bootstrap genérico (sem rule de projeto).

## CLI

```bash
npm run onboard                              # interativo
npm run onboard -- --project=/path/to/repo   # caminho fixo
npm run onboard -- --profile=next --project=/path --yes
npm run onboard -- --no-code-review --yes    # só skills + bootstrap
```

### Flags

| Flag | Efeito |
| --- | --- |
| `--project=PATH` | Repositório alvo |
| `--profile=NAME` | Perfil (pula menu) |
| `--no-code-review` | Não roda setup:code-review |
| `--yes`, `-y` | Defaults sem prompts |
| `--skip-extras` | Não oferece boot-sync / inbox / CLI |

## Resposta ao usuário

Confirmar perfil escolhido ou detectado, resumo do bootstrap e sugerir `npm run health` após abrir o projeto no Cursor.
