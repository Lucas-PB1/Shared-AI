# Onboarding HostDime IA (`/onboard`)

Atualiza o clone **hostdime-ia** e deixa o ambiente Cursor pronto — só falta preencher `.env` / sync de conexões quando for usar o dashboard.

## Quando usar

- Primeira vez no hostdime-ia (dev novo no time)
- Voltar ao monorepo e **atualizar** (pull + sync) sem refazer tudo na mão
- Novo repositório para vincular ao Cursor
- Substituir a sequência manual do README

## O que o Agent deve fazer

1. Ir à raiz do monorepo `hostdime-ia` (onde está este pacote / `package.json` do hostdime-ia).
2. Rodar o wizard (não inventar passos paralelos):

```bash
npm run onboard -- --yes
# ou com projeto explícito:
npm run onboard -- --project=/caminho/do/repo --profile=next --yes
```

3. Relatar o resumo do script: o que rodou (pull, sync, `.env`, bootstrap) e o que **ainda falta** (quase sempre secrets do `.env`).

Não preencher `.env` com secrets reais no chat. Orientar o usuário a editar o arquivo ou usar `env:switch`.

## Fluxo (CLI)

1. **git pull --ff-only** no monorepo (continua se falhar)
2. **`.env` vazio** — `npm run setup -- --env-only` (cria se faltar; **não** sobrescreve nem preenche)
3. **npm install** se `node_modules` ausente
4. **setup:skills** (se preciso) + **`npm run sync`**
5. **setup:code-review** — opcional
6. **Projeto** — default = monorepo; pergunta o caminho se interativo
7. **bootstrap** — `review/` + rule/SKILLS-ROUTING + registry
8. **Dashboard Next.js** (se monorepo ou perfil `next`):
   - `npm install`
   - se Supabase local estiver **up**: `env:switch -- local --refresh-keys` + `connections:seed`
   - se não: deixa `.env` vazio e lista os comandos
9. **Extras** — boot-sync, sync-inbox, Cursor CLI, MCP HubSpot (se hubspot)

## Perfis

| Perfil | Detectado quando |
| --- | --- |
| `laravel` | `laravel/framework` no composer |
| `hubspot` | `hsproject.json` ou `@hubspot/*` |
| `react` | `react` / `react-dom` no package.json |
| `next` | `next` no package.json |
| `python` | `pyproject.toml`, `requirements.txt`, `setup.py` |
| `zend-laminas` | `laminas/*` ou `zendframework/*` no composer |

Detecção: `packages/cursor/scripts/lib/profiles/ts/detect-stack.ts`.  
Opção **s** = bootstrap genérico (sem rule de projeto).

## CLI

```bash
npm run onboard                              # interativo
npm run onboard -- --yes                     # defaults (monorepo + sync)
npm run onboard -- --project=/path --profile=next --yes
npm run onboard -- --no-code-review --yes
npm run onboard -- --skip-pull --yes         # sem git pull
```

### Flags

| Flag | Efeito |
| --- | --- |
| `--project=PATH` | Repositório alvo (default: monorepo) |
| `--profile=NAME` | Perfil (pula menu) |
| `--no-code-review` | Não roda setup:code-review |
| `--yes`, `-y` | Defaults sem prompts |
| `--skip-extras` | Não oferece boot-sync / inbox / CLI |
| `--skip-pull` | Não faz `git pull` no monorepo |

## Depois do onboard (pendências típicas)

Se o Supabase local **não** estava rodando, o Next fica instalado mas sem secrets:

```bash
npm run supabase:start
npm run env:switch -- local --refresh-keys
npm run connections:seed
npm run dev
```

Se o local já estava up, o onboard já tentou `env:switch` + `connections:seed` — basta `npm run dev`.

## Resposta ao usuário

Dizer em poucas linhas: atualizado (pull/sync), Next configurado (`npm install`, perfil), se `.env` foi preenchido via Supabase local ou ainda falta — e o comando seguinte (`supabase:start` ou `npm run dev`).
