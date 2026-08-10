---
type: Playbook
title: HostDime IA no Windows
description: >-
  Install, sync, hooks e limites do review no Windows (PowerShell nativo).
tags: [windows, powershell, playbook]
timestamp: 2026-08-10T16:00:00Z
---

## Contexto

Suporte nativo via **PowerShell** (sem Git Bash ou WSL para install/sync/bootstrap).  
Plataformas: **Windows** e **Linux** apenas.

## Pré-requisitos

| Ferramenta | Versão | Obrigatório |
| --- | --- | --- |
| Windows | 10+ | sim |
| PowerShell | 5.1+ | sim |
| Node.js | 20+ | sim |
| Git | recente | recomendado |
| PHP / Composer / Semgrep | — | só `setup:code-review` |

## Instalação

```powershell
git clone https://github.com/hostdime/hostdime-ia.git
cd hostdime-ia
npm run setup:skills
npm run setup:code-review
npm run bootstrap -- C:\caminho\do\seu\projeto
# opcional: --profile=laravel
```

## Atualização

```powershell
cd hostdime-ia
git pull
npm run sync
npm run status
```

## Symlinks

Ordem de tentativa: **SymbolicLink** (Developer Mode ou admin) → **Junction** (pastas) → **HardLink** (mesmo drive do perfil).  
Clone em drive diferente de `%USERPROFILE%`: preferir Developer Mode ou mover o clone.

`npm run doctor` / `status` listam links quebrados.

## Hook sessionStart

`setup:skills` registra PowerShell em `%USERPROFILE%\.cursor\hooks.json` (`ensure-project-cursor.ps1`).  
Canal **Hooks** no Output do Cursor para diagnóstico.

| Sintoma | Ação |
| --- | --- |
| Dialog “Como abrir este arquivo?” | `npm run setup:skills` ou `sync` (hooks ainda apontando `.sh`) |
| Hook não relinka | Abrir pasta com path Windows `C:\...` |
| Versão desatualizada | `git pull && npm run sync` |

## Comandos npm

| Comando | Ação |
| --- | --- |
| `setup:skills` / `setup:code-review` | Install em `~\.cursor` |
| `bootstrap` / `detach` / `sync` | Projeto e machine |
| `doctor` / `status` / `health` | Diagnóstico |
| `cursor-cli` / `agent` | CLI agent + modo auto |
| `historico` | Watches `/historico` (`merge-hooks` no projeto) |
| `boot-sync` | Task Scheduler no logon |

## Limites (bash)

- **`review:ci` / pre-commit git**: ainda bash — use Git Bash, WSL ou confie no CI Linux.
- Pular pre-commit: `$env:HOSTDIME_SKIP_PRE_COMMIT=1`.

```bash
# Git Bash / WSL
HOSTDIME_IA_ROOT=/c/path/hostdime-ia npm run hooks:pre-commit -- /c/path/projeto
```

## Cursor CLI

```powershell
npm run cursor-cli -- install
npm run cursor-cli -- status
npm run cursor-cli -- login
# headless: agent -p --force "prompt" + CURSOR_API_KEY
```

## Relacionados

- [Review store](review-store.md) (secrets iguais no tooling)
- [README monorepo](../../README.md)
