# HostDime IA no Windows

Suporte nativo via **PowerShell** (sem Git Bash ou WSL). Linux e macOS continuam usando os scripts bash originais.

## Pré-requisitos

| Ferramenta | Versão | Obrigatório |
|------------|--------|-------------|
| Windows | 10+ | sim |
| PowerShell | 5.1+ (já incluído) | sim |
| Node.js | 20+ | sim |
| Python | 3.x | sim (merge de `hooks.json`) |
| Git | qualquer recente | recomendado |
| PHP / Composer / Semgrep | — | só para `setup:code-review` |

## Instalação

```powershell
git clone https://github.com/hostdime/hostdime-ia.git
cd hostdime-ia
npm run setup:skills
npm run setup:code-review
npm run bootstrap -- C:\caminho\do\seu\projeto
```

Com perfil de stack:

```powershell
npm run bootstrap -- C:\dev\meu-repo --profile=laravel
```

## Atualização após `git pull`

```powershell
cd hostdime-ia
git pull
npm run sync
npm run status
```

## Symlinks no Windows

O pacote tenta criar links na seguinte ordem:

1. **SymbolicLink** — ideal; exige **Developer Mode** (Configurações → Privacidade e segurança → Para desenvolvedores) ou execução como administrador
2. **Junction** (pastas) — funciona sem privilégio extra
3. **HardLink** (arquivos) — funciona no **mesmo drive** que `%USERPROFILE%`

Se o clone estiver em `D:\` e o perfil em `C:\Users\...`, hardlinks de arquivos falham. Soluções:

- Mover o clone para o mesmo drive do perfil, ou
- Ativar Developer Mode para symlinks reais

`npm run doctor` e `npm run status` indicam links quebrados ou ausentes.

## Cursor hook (`sessionStart`)

No Windows, o hook **não** usa `.sh`. O `setup:skills` registra em `%USERPROFILE%\.cursor\hooks.json`:

```json
{
  "command": "powershell -NoProfile -ExecutionPolicy Bypass -File ./hooks/ensure-project-cursor.ps1"
}
```

Ao abrir um workspace, o hook:

- lê `workspace_roots` do JSON enviado pelo Cursor
- executa `Link-Project.ps1` no projeto
- registra o projeto para `npm run sync`

### Verificar se o hook funciona

1. View → **Output** → canal **Hooks**
2. Inicie um novo chat Agent no projeto
3. Deve aparecer execução de `sessionStart` **sem** dialog “Como abrir este arquivo?”

### Troubleshooting de hooks

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Dialog “Como abrir este arquivo?” | `hooks.json` aponta para `.sh` | Rode `npm run setup:skills` ou `npm run sync` |
| Exit code 1, sem output | Terminal padrão Git Bash conflitando | Comando já força PowerShell; reinicie o Cursor |
| Hook não relinka projeto | Path inválido em `workspace_roots` | Abra a pasta pelo path Windows (`C:\...`), não misture WSL |
| Versão desatualizada no stderr | Clone ≠ versão instalada | `git pull && npm run sync` |

## Comandos npm (Windows)

| Comando | Ação |
|---------|------|
| `npm run setup:skills` | Instala rules, skills, scripts `.ps1` e hook em `%USERPROFILE%\.cursor` |
| `npm run setup:code-review` | Instala commands `/avaliar`, ferramentas review |
| `npm run bootstrap -- <repo>` | Symlinks no projeto + registry |
| `npm run historico -- status` | Watches de histórico por escopo (`/historico`) |
| `npm run cursor-cli -- install` | Instala `agent` + modo auto (`approvalMode=unrestricted`) |
| `npm run agent -- [args]` | Roda `agent` com rules/commands alinhados à IDE |
| `npm run sync` | Reinstala pacotes, deps, relink projetos |
| `npm run detach -- <repo>` | Remove symlinks gerenciados |
| `npm run doctor` | Diagnóstico |
| `npm run status` | Versão, links, projetos |

## WSL

Não é necessário. Se preferir ambiente Linux, use WSL e siga o [README](../README.md) normal — o dispatcher detecta o OS automaticamente.

## `review:ci` no Windows

Ainda depende de **Git Bash** (`bash` no PATH). Use WSL ou CI Linux para review automatizado, se Git Bash não estiver disponível.

## Sync ao iniciar o computador

Mesmos comandos do Linux:

```powershell
npm run boot-sync -- on
npm run boot-sync -- off
npm run boot-sync -- status
```

Agendamento via **Task Scheduler** (logon). Log: `%USERPROFILE%\.cursor\hostdime-ia\boot-sync.log`

Na primeira `npm run sync` interativa, pergunta se deseja ativar.

## Command `/historico` (hook `stop` no projeto)

O watch de histórico é **por projeto**, não global. Após `/historico setup`, o Agent copia para `.cursor/hooks/`:

- `historico-stop.ps1` — hook `stop` no Windows
- `historico-stop.sh` — Unix
- `history-watch-match.py` — matcher de escopo

Merge em `.cursor/hooks.json` do projeto:

```powershell
npm run historico -- merge-hooks
```

O merge registra:

```json
{
  "command": "powershell -NoProfile -ExecutionPolicy Bypass -File .cursor/hooks/historico-stop.ps1"
}
```

Verifique no canal **Hooks** do Cursor após editar arquivos no escopo observado — o hook deve emitir `followup_message` pedindo append no arquivo de histórico.

## Command `/cursor-cli`

Instala o binário `agent` e configura **modo auto** (`approvalMode: unrestricted` em `%USERPROFILE%\.cursor\cli-config.json`):

```powershell
npm run cursor-cli -- install
npm run cursor-cli -- status
npm run cursor-cli -- login
```

Instalação nativa (alternativa):

```powershell
irm 'https://cursor.com/install?win32=true' | iex
```

Headless (CI/scripts): `agent -p --force "prompt"` com `CURSOR_API_KEY`. Ver [Cursor CLI headless](https://cursor.com/docs/cli/headless).

Wrapper alinhado à IDE:

```powershell
cd C:\dev\meu-repo
npm run agent -- "refatorar módulo auth"
npm run agent -- -p --force "fix lint"
```

Antes de executar, relinka rules/commands (como o hook `sessionStart`).

## Pre-commit

O hook git (`review-pre-commit.sh`) é **bash**. No Windows:

- use **Git Bash** ou **WSL** para instalar/rodar o hook, **ou**
- rode `npm run review:ci` no CI e confie no pipeline
- pule localmente: `$env:HOSTDIME_SKIP_PRE_COMMIT=1` (ou `HOSTDIME_SKIP_PRE_COMMIT=1` no Bash)

```bash
# Git Bash / WSL
HOSTDIME_IA_ROOT=/c/path/hostdime-ia npm run hooks:pre-commit -- /c/path/projeto
```
