# Cursor CLI — instalar e configurar (`/cursor-cli`)

Instala o **Cursor CLI** (`agent`), aplica a config shared-ai (`approvalMode: allowlist` + permissions) e prepara autenticação.

**Run Everything** (`approvalMode: unrestricted`) é **opt-in**: `npm run cursor-cli -- configure --unrestricted`.

## Quando usar

- `/cursor-cli` — instalar + configurar (primeira vez)
- `/cursor-cli status` — versão, login, `approvalMode`
- `/cursor-cli login` — autenticar via browser
- Automação headless, CI ou manipular o Agent fora do IDE

## O que é manipulável

| Camada | Como |
| --- | --- |
| **CLI interativo** | `agent`, `agent "prompt"`, modos `--mode=plan\|ask` |
| **Headless / scripts** | `agent -p --force "prompt"` (aplica edits sem confirmação por turno) |
| **Config global** | `~/.cursor/cli-config.json` — `approvalMode`, permissions, model |
| **Config projeto** | `.cursor/cli.json` — só `permissions` |
| **SDK** | `@cursor/sdk` / `cursor-sdk` — agents em código (skill `sdk`) |

Este command cobre **install + auto** na config global. SDK e pipelines ficam para passos seguintes.

## Pré-requisitos

- Conta Cursor (subscription)
- Node não é obrigatório para o binário `agent`; Python 3 para merge de config
- Linux ou Windows PowerShell nativo

## Fluxo (`/cursor-cli`)

1. Verificar se `agent` está no PATH (`agent --version`)
2. Se ausente, instalar:

```bash
# Unix
curl https://cursor.com/install -fsS | bash

# Windows (PowerShell)
irm 'https://cursor.com/install?win32=true' | iex
```

3. Merge em `~/.cursor/cli-config.json` com template `cli-config.auto.json`:

| Campo | Valor |
| --- | --- |
| `approvalMode` | `allowlist` — só se ainda não definido; **nunca sobrescreve** o valor do usuário. `unrestricted` só com `--unrestricted` |
| `permissions.allow` | Comandos só-leitura (`ls`, `cat`, `grep`, `rg`, …) — somados aos do usuário |
| `permissions.deny` | `rm`, `sudo`, `dd`, `mkfs`, `shred`; leitura/escrita de credenciais (`.env`, `.pem`, `.key`, `.ssh/`); escrita em `.git/hooks/` |

4. **PATH** — adiciona `~/.local/bin` e `~/.cursor/bin` ao `~/.bashrc` / `~/.zshrc` (marker shared-ai)
5. **Login** — se `agent status` não estiver autenticado, abre `agent login` (browser, uma vez)
6. Resumo: path, approvalMode, login ok

### Executar via shared-ai

```bash
npm run cursor-cli -- install          # install + config (allowlist) + PATH + login
npm run cursor-cli -- configure --unrestricted   # opt-in Run Everything
npm run cursor-cli -- install --skip-login   # CI / já autenticado
npm run cursor-cli -- configure
npm run cursor-cli -- status
npm run cursor-cli -- login
```

Ou após `setup:skills`:

```bash
~/.cursor/install-cursor-cli.sh
~/.cursor/run-agent.sh                 # wrapper de qualquer pasta
```

## Modos de aprovação

| Modo | Como ativar | Comportamento |
| --- | --- | --- |
| `allowlist` (padrão) | `install` / `configure` | Roda sem prompt só o que está em `permissions.allow`; o resto pede confirmação |
| `unrestricted` (opt-in) | `configure --unrestricted` | **Run Everything** — sem prompt por operação |

- **`--approve-mcps`** — o wrapper `npm run agent` aprova MCPs automaticamente
- **`permissions.deny`** — vale nos dois modos, mas é **rede de proteção, não sandbox**: `find -delete`, `git clean -fdx`, `mv`, `python -c` e afins passam
- Headless: `-p --force`. O wrapper só injeta `--force` sozinho quando `approvalMode=unrestricted`; no modo padrão, passe `--force` explicitamente

Para CI sem browser: `export CURSOR_API_KEY=...` antes do install.

## Comandos úteis pós-setup

```bash
npm run agent                    # sessão interativa (cwd = projeto)
npm run agent -- "refatorar auth"
npm run agent -- -p --force "fix lint"
npm run agent -- resume
agent update                     # atualizar CLI (direto)
```

O wrapper `npm run agent` prepara `review/` via `link-project` antes de executar — mesmo efeito do hook `sessionStart` da IDE. Orquestrador e commands shared-ai já estão em `~/.cursor/`.

## Wrapper `npm run agent`

| Passo | O que faz |
| --- | --- |
| 1 | Sobe diretórios até achar `.cursor/` (raiz do projeto) |
| 2 | `link-project --quiet` — review/ (+ remove orquestrador/commands antigos do projeto) |
| 3 | Registra projeto no sync shared-ai |
| 4 | `cd` na raiz e executa `agent` com os args passados |

Opções do wrapper: `--project=/path`, `--dry-run` (debug).

O CLI/IDE carregam rules/commands do projeto e do usuário (`~/.cursor/rules/`, `~/.cursor/commands/`).

## Segurança

`unrestricted` executa ferramentas sem prompt — só em máquina de dev confiável, de preferência com o repo em container/VM. `status` avisa quando está ativo.

O merge **não rebaixa** um `unrestricted` existente (respeita a escolha do usuário). Para voltar ao modo seguro, edite `~/.cursor/cli-config.json`:

```json
{ "approvalMode": "allowlist" }
```

## Relacionado

- [Cursor CLI overview](https://cursor.com/docs/cli/overview)
- [Configuration](https://cursor.com/docs/cli/reference/configuration)
- [Headless](https://cursor.com/docs/cli/headless)
- Skill `sdk` — automação programática além do binário `agent`

## Resposta ao usuário

Informar: instalado ou já presente, path do `agent`, `approvalMode` (avisar se `unrestricted`), se precisa `login`, e um exemplo de uso (`agent` ou `agent -p --force`).
