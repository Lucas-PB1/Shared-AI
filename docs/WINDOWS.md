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
| `npm run sync` | Reinstala pacotes, deps, relink projetos |
| `npm run detach -- <repo>` | Remove symlinks gerenciados |
| `npm run doctor` | Diagnóstico |
| `npm run status` | Versão, links, projetos |

## WSL

Não é necessário. Se preferir ambiente Linux, use WSL e siga o [README](../README.md) normal — o dispatcher detecta o OS automaticamente.

## `review:ci` no Windows

Ainda depende de **Git Bash** (`bash` no PATH). Use WSL ou CI Linux para review automatizado, se Git Bash não estiver disponível.
