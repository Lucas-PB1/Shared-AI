# HostDime IA

Dois pacotes e uma família de comandos npm para skills/rules do Cursor e code-review.

## Onboarding: só skills vs skills + code-review

| Modo | Quando usar | Comandos |
| --- | --- | --- |
| **Só skills** | Orquestrador, skills e rules — sem `/avaliar` | `npm run setup:skills` → `npm run bootstrap -- <repo>` |
| **Skills + code-review** | Setup completo (recomendado) | `npm run onboard` **ou** `setup:skills` + `setup:code-review` + `bootstrap` |
| **Só code-review** | Máquina já tem skills; falta inbox/review | `npm run setup:code-review` → `npm run bootstrap -- <repo>` |

`setup:code-review` instala deps (`npm`/`composer`) e commands `/avaliar`, `/avaliar-diff`, `/finalizar`, etc. Sem ele, o bootstrap ainda cria `.cursor/review/`, mas as ferramentas e commands globais do review podem faltar — use `npm run doctor`.

Wizard (setup + perfil + bootstrap + extras):

```bash
git clone https://github.com/hostdime/hostdime-ia.git
cd hostdime-ia
npm run onboard
```

Passo a passo manual (skills + code-review):

```bash
git clone https://github.com/hostdime/hostdime-ia.git
cd hostdime-ia
npm run setup:skills
npm run setup:code-review
npm run bootstrap -- /caminho/do/seu/projeto
```

Só skills:

```bash
git clone https://github.com/hostdime/hostdime-ia.git
cd hostdime-ia
npm run setup:skills
npm run bootstrap -- /caminho/do/seu/projeto
```

| Comando | Escopo | O que faz |
| --- | --- | --- |
| `npm run setup:skills` | Máquina | Rules, skills, hooks (merge), motor de sync |
| `npm run setup:code-review` | Máquina | Commands `/avaliar`, `/avaliar-diff`, `/finalizar`, ferramentas |
| `npm run bootstrap -- <repo>` | Projeto | Symlinks + pastas `.cursor/review/` |
| `npm run bootstrap -- <repo> --profile=laravel\|hubspot\|react\|next\|python\|zend-laminas` | Projeto | + `SKILLS-ROUTING.md` e rule do stack |
| `npm run detach -- <repo>` | Projeto | Remove symlinks gerenciados; desregistra do sync |
| `npm run detach -- <repo> --keep-registry` | Projeto | Só remove symlinks; mantém no registry |
| `npm run sync` | Máquina | Após `git pull` — symlinks, hooks (merge), deps, relink projetos |
| `npm run sync -- --migrate` | Máquina | Igual ao sync, mas substitui cópias antigas (rsync) por symlinks |
| `npm run status` | Máquina | Versão, projetos, conflitos, symlinks quebrados |
| `npm run doctor` | Máquina | Diagnóstico rápido: ferramentas, hooks, instalação |
| `npm run boot-sync -- on\|off\|status` | Máquina | Sync automático ao iniciar o computador (git pull + sync) |
| `npm run historico -- status\|validate\|merge-hooks` | Projeto | CLI do command `/historico` (watches, hook stop) |
| `npm run cursor-cli -- install\|status\|login` | Máquina | Instala `agent` + config modo auto (`approvalMode=unrestricted`) |
| `npm run agent -- [args]` | Projeto | Roda `agent` com rules/commands alinhados à IDE |
| `npm run sync-inbox -- on\|run\|status` | Máquina | Inbox de projetos sync com git dirty ao iniciar sessão |
| `npm run onboard` | Máquina + projeto | Wizard: setup, perfil, bootstrap, extras |
| `npm run health` | Máquina | Saúde dos projetos registrados (symlinks, git, review) |
| `npm run review:ci -- [base]` | Projeto | Mesmo review-check do `/avaliar` nos arquivos do diff |
| `npm run pre-commit` | Projeto | Review estático nos **arquivos do stage** (sem LLM) |
| `npm run hooks:pre-commit -- [dir]` | Projeto | Instala `.git/hooks/pre-commit` |
| `npm run lint:shell` | Dev | ShellCheck nos `*.sh` versionados (skip se não instalado) |
| `npm run lint:python` | Dev | `py_compile` dos tools Python de code-review |
| `npm run test` | Dev | Suite de testes (`tests/`; bats se disponível, senão runner embutido) |

## Windows

Suporte nativo via PowerShell — sem WSL ou Git Bash para install, sync, bootstrap e hooks. Veja [docs/WINDOWS.md](docs/WINDOWS.md).

```powershell
npm run setup:skills
npm run bootstrap -- C:\caminho\do\seu\projeto
```

Linux e macOS usam os mesmos comandos npm; o dispatcher (`run.mjs`) roteia para bash ou PowerShell conforme o OS.

### Sync ao iniciar o computador

Na **primeira** `npm run sync` interativa, pergunta se deseja `git pull` + sync automático ao logar. Controle manual:

```bash
npm run boot-sync -- on      # liga
npm run boot-sync -- off     # desliga
npm run boot-sync -- status  # estado + log
npm run boot-sync -- run     # testar agora
```

Log: `~/.cursor/hostdime-ia/boot-sync.log` — agendamento via systemd (Linux), LaunchAgent (macOS) ou Task Scheduler (Windows).

## Atualização

Rules, skills e commands são **symlinks** para o clone local. Depois de editar o repo:

```bash
cd hostdime-ia
git pull
npm run sync
npm run status
```

Conteúdo já editado no repo reflete na hora nos symlinks; `sync` recria links novos, atualiza deps e relinka projetos registrados.

## Coexistência com rules/skills próprias

O hostdime-ia **nunca sobrescreve** arquivo real em `~/.cursor/` ou no projeto. Se existir skill/rule/command própria no mesmo caminho, o pacote **pula** e o `status` avisa.

No projeto, `.cursor/skills/<nome>/` real **sobrescreve** a skill global (comportamento do orquestrador Cursor).

O `bootstrap` também atualiza o `.gitignore` do projeto com symlinks e conteúdo operacional de `review/`, **somente** quando `.cursor/` inteiro ainda não está ignorado. Rules e skills próprias do projeto continuam versionáveis.

## Estrutura

```
hostdime-ia/
├── CHECKLIST.md          # backlog de melhorias
├── VERSION
├── package.json
├── package-lock.json     # versionado (npm ci)
├── composer.lock         # versionado (PHPStan do review-check)
├── docs/
│   ├── PLANO-SAUDE.md    # plano de hardening por fases
│   └── WINDOWS.md
├── tests/
└── packages/
    ├── cursor/
    └── code-review/
```

Plano de saúde (fases e preparações): [docs/PLANO-SAUDE.md](docs/PLANO-SAUDE.md).

MIT — [LICENSE](LICENSE).
