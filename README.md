# Shared AI

Pacotes de skills/rules do Cursor e **dashboard Next.js** (Auth no Supabase local) na raiz do monorepo.

## Dashboard

Lista os repositórios ligados em `~/.cursor/shared-ai/projects.json`.

```bash
npm run setup              # .env vazio + npm install
npm run supabase:start
# copie URL e keys de npm run supabase:status para o .env
npm run dev                # http://localhost:3000
```

Só recriar o `.env` (sem `npm install`):

```bash
npm run setup -- --env-only
# sobrescrever .env existente: npm run setup -- --env-only --force
```

Detalhes: [`docs/okf/dashboard-web.md`](docs/okf/dashboard-web.md).

## Onboarding

```bash
git clone https://github.com/your-org/shared-ai.git
cd shared-ai
npm run onboard
```

Ou na mão:

```bash
npm run setup:skills
npm run bootstrap -- /caminho/do/seu/projeto
```

| Comando | Escopo | O que faz |
| --- | --- | --- |
| `npm run setup:skills` | Máquina | Rules, skills, hooks (merge), motor de sync |
| `npm run bootstrap -- <repo>` | Projeto | Symlinks + registry |
| `npm run bootstrap -- <repo> --profile=monorepo\|nestjs\|next\|react` | Projeto | + `SKILLS-ROUTING.md` e rule do stack |
| `npm run detach -- <repo>` | Projeto | Remove symlinks gerenciados; desregistra do sync |
| `npm run detach -- <repo> --keep-registry` | Projeto | Só remove symlinks; mantém no registry |
| `npm run sync` | Máquina | Após `git pull` — symlinks, hooks (merge), deps, relink projetos |
| `npm run sync -- --migrate` | Máquina | Igual ao sync, mas substitui cópias antigas por symlinks |
| `npm run status` | Máquina | Versão, projetos, conflitos, symlinks quebrados |
| `npm run doctor` | Máquina | Diagnóstico rápido: ferramentas, hooks, instalação |
| `npm run boot-sync -- on\|off\|status` | Máquina | Sync automático ao iniciar o computador (git pull + sync) |
| `npm run historico -- status\|validate\|merge-hooks` | Projeto | CLI do command `/historico` (watches, hook stop) |
| `npm run cursor-cli -- install\|status\|login` | Máquina | Instala `agent` + config modo auto (`approvalMode=unrestricted`) |
| `npm run agent -- [args]` | Projeto | Roda `agent` com rules/commands alinhados à IDE |
| `npm run sync-inbox -- on\|run\|status` | Máquina | Inbox de projetos sync com git dirty ao iniciar sessão |
| `npm run onboard` | Máquina + projeto | Wizard: setup, perfil, bootstrap, extras |
| `npm run health` | Máquina | Saúde dos projetos registrados |
| `npm run setup` | Dev | Cria `.env` vazio (de `.env.example`) + `npm install` |
| `npm run setup -- --env-only` | Dev | Só cria/recria `.env` (use `--force` para sobrescrever) |
| `npm run lint:shell` | Dev | ShellCheck nos `*.sh` versionados (skip se não instalado) |
| `npm run lint:ts` | Dev | `tsc --noEmit` (scripts Cursor) |
| `npm run test` | Dev | Slug do registry |
| `npm run release -- patch\|minor\|major` | Dev | Bump `VERSION` + `package.json` + `CHANGELOG` (sem commit) |

## Plataformas

| OS | Runtime |
| --- | --- |
| **Windows** | PowerShell + Node (sem WSL/Git Bash para o dia a dia) |
| **Linux** | Bash |

macOS e outros SOs **não são suportados**. O dispatcher recusa plataformas diferentes de `win32` e `linux`.

Windows: [docs/okf/windows.md](docs/okf/windows.md).

```powershell
npm run setup:skills
npm run bootstrap -- C:\caminho\do\seu\projeto
```

Linux:

```bash
npm run setup:skills
npm run bootstrap -- /caminho/do/seu/projeto
```

### Sync ao iniciar o computador

Na **primeira** `npm run sync` interativa, pergunta se deseja `git pull` + sync automático ao logar. Controle manual:

```bash
npm run boot-sync -- on      # liga
npm run boot-sync -- off     # desliga
npm run boot-sync -- status  # estado + log
npm run boot-sync -- run     # testar agora
```

Log: `~/.cursor/shared-ai/boot-sync.log` — agendamento via **systemd** (Linux) ou **Task Scheduler** (Windows).

## Atualização

Rules, skills e commands são **symlinks** para o clone local. Depois de editar o repo:

```bash
cd shared-ai
git pull
npm run sync
npm run status
```

Conteúdo já editado no repo reflete na hora nos symlinks; `sync` recria links novos, atualiza deps e relinka projetos registrados.

## Coexistência com rules/skills próprias

O Shared AI **nunca sobrescreve** arquivo real em `~/.cursor/` ou no projeto. Se existir skill/rule/command própria no mesmo caminho, o pacote **pula** e o `status` avisa.

No projeto, `.cursor/skills/<nome>/` real **sobrescreve** a skill global (comportamento do orquestrador Cursor).

O `bootstrap` também atualiza o `.gitignore` do projeto com symlinks gerenciados, **somente** quando `.cursor/` inteiro ainda não está ignorado. Rules e skills próprias do projeto continuam versionáveis.

## Estrutura

```
shared-ai/
├── CHECKLIST.md          # backlog aberto
├── VERSION
├── package.json
├── package-lock.json
├── docs/
│   ├── README.md                 # aponta ao bundle OKF
│   └── okf/                      # knowledge bundle OKF v0.1
│       ├── index.md
│       ├── log.md
│       └── *.md                  # concepts
├── supabase/                     # migrations + seed
├── tests/
└── packages/
    └── cursor/
```

Docs: [docs/okf/index.md](docs/okf/index.md) · [docs/README.md](docs/README.md).

## Licença

Este repositório é distribuído sob a **[MIT License](LICENSE)** — Copyright (c) 2026.

O campo `"private": true` no `package.json` só impede publicação acidental no npm; **não** altera a licença do código.
