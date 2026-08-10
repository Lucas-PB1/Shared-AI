# Cursor CLI — instalar e configurar (`/cursor-cli`)

Instala o **Cursor CLI** (`agent`), configura **modo auto** (`approvalMode: unrestricted`) e prepara autenticação.

## Quando usar

- `/cursor-cli` — instalar + configurar auto (primeira vez)
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
| `approvalMode` | `unrestricted` — execução auto (modo auto) |
| `permissions.deny` | `Shell(rm)`, credenciais (`.env`, `.pem`, `.key`) |

4. **PATH** — adiciona `~/.local/bin` e `~/.cursor/bin` ao `~/.bashrc` / `~/.zshrc` (marker hostdime)
5. **Login** — se `agent status` não estiver autenticado, abre `agent login` (browser, uma vez)
6. Resumo: path, approvalMode, login ok

### Executar via hostdime-ia

```bash
npm run cursor-cli -- install          # install + auto + PATH + login
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

## Modo auto — o que significa

- **`approvalMode: unrestricted`** = **Run Everything** no rodapé do CLI (sem prompt por operação)
- **`--approve-mcps`** — o wrapper `npm run agent` aprova MCPs automaticamente
- **`permissions.deny`** — ainda bloqueia `Shell(rm)` e escrita em credenciais
- Headless: `-p --force` (wrapper injeta `--force` se faltar)

Para CI sem browser: `export CURSOR_API_KEY=...` antes do install.

## Comandos úteis pós-setup

```bash
npm run agent                    # sessão interativa (cwd = projeto)
npm run agent -- "refatorar auth"
npm run agent -- -p --force "fix lint"
npm run agent -- resume
agent update                     # atualizar CLI (direto)
```

O wrapper `npm run agent` prepara `review/` via `link-project` antes de executar — mesmo efeito do hook `sessionStart` da IDE. Orquestrador e commands hostdime já estão em `~/.cursor/`.

## Wrapper `npm run agent`

| Passo | O que faz |
| --- | --- |
| 1 | Sobe diretórios até achar `.cursor/` (raiz do projeto) |
| 2 | `link-project --quiet` — review/ (+ remove orquestrador/commands antigos do projeto) |
| 3 | Registra projeto no sync hostdime |
| 4 | `cd` na raiz e executa `agent` com os args passados |

Opções do wrapper: `--project=/path`, `--dry-run` (debug).

O CLI/IDE carregam rules/commands do projeto e do usuário (`~/.cursor/rules/`, `~/.cursor/commands/`).

## Segurança

`unrestricted` executa ferramentas sem prompt. Use em máquina de dev confiável. Para restringir:

```bash
npm run cursor-cli -- configure   # re-aplica template hostdime
# ou edite manualmente approvalMode para allowlist + permissions.allow
```

## Relacionado

- [Cursor CLI overview](https://cursor.com/docs/cli/overview)
- [Configuration](https://cursor.com/docs/cli/reference/configuration)
- [Headless](https://cursor.com/docs/cli/headless)
- Skill `sdk` — automação programática além do binário `agent`

## Resposta ao usuário

Informar: instalado ou já presente, path do `agent`, `approvalMode`, se precisa `login`, e um exemplo de uso (`agent` ou `agent -p --force`).
