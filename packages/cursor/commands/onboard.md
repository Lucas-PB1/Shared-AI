# Onboarding Shared AI (`/onboard`)

Atualiza o clone **shared-ai** e deixa o ambiente Cursor pronto — só falta preencher `.env` quando for usar o dashboard local.

## Quando usar

- Primeira vez no shared-ai
- Voltar ao monorepo e **atualizar** (pull + sync)
- Novo repositório para vincular ao Cursor

## O que o Agent deve fazer

1. Ir à raiz do monorepo `shared-ai`.
2. Rodar o wizard:

```bash
npm run onboard -- --yes
# ou com projeto explícito:
npm run onboard -- --project=/caminho/do/repo --profile=next --yes
```

3. Relatar o resumo: pull, sync, `.env`, bootstrap e o que falta (quase sempre keys do Supabase local).

Não preencher `.env` com secrets reais no chat.

## Fluxo (CLI)

1. **git pull --ff-only** no monorepo (continua se falhar)
2. **`.env` vazio** — `npm run setup -- --env-only`
3. **npm install** se `node_modules` ausente
4. **setup:skills** + **`npm run sync`**
5. **Projeto** — default = monorepo
6. **bootstrap** — rule/SKILLS-ROUTING + registry
7. **Dashboard Next.js** (se monorepo ou perfil `next`): `npm install`; lembrar `supabase:start` + keys no `.env`
8. **Extras** — boot-sync, sync-inbox, Cursor CLI

## CLI

```bash
npm run onboard                              # interativo
npm run onboard -- --yes                     # defaults (monorepo + sync)
npm run onboard -- --project=/path --profile=next --yes
npm run onboard -- --skip-pull --yes         # sem git pull
```

### Flags

| Flag | Efeito |
| --- | --- |
| `--project=PATH` | Repositório alvo (default: monorepo) |
| `--profile=NAME` | Perfil (pula menu) |
| `--yes`, `-y` | Defaults sem prompts |
| `--skip-extras` | Não oferece boot-sync / inbox / CLI |
| `--skip-pull` | Não faz `git pull` no monorepo |

## Depois do onboard

```bash
npm run supabase:start
# copie keys para o .env
npm run dev
```
