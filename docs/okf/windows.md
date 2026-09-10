---
type: Playbook
title: Shared AI no Windows
description: >-
  Install, sync e hooks no Windows (PowerShell nativo).
tags: [windows, powershell, playbook]
timestamp: 2026-09-10T16:00:00Z
---

## Contexto

Suporte nativo via **PowerShell** e **Node** (sem Git Bash ou WSL para install, sync, bootstrap, test e lint).  
Plataformas: **Windows** e **Linux** apenas.

## Pré-requisitos

| Ferramenta | Versão | Obrigatório |
| --- | --- | --- |
| Windows | 10+ | sim |
| PowerShell | 5.1+ | sim |
| Node.js | 20+ | sim |
| Git | recente | recomendado |

## Instalação

```powershell
git clone https://github.com/your-org/shared-ai.git
cd shared-ai
npm run setup:skills
npm run bootstrap -- C:\caminho\do\seu\projeto
# opcional: --profile=next
```

## Atualização

```powershell
cd shared-ai
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
| `setup:skills` | Install em `~\.cursor` |
| `bootstrap` / `detach` / `sync` | Projeto e machine |
| `doctor` / `status` / `health` | Diagnóstico |
| `cursor-cli` / `agent` | CLI agent + modo auto |
| `historico` | Watches `/historico` (`merge-hooks` no projeto) |
| `lint:ts` / `test` | Node (`scripts/run-task.mjs`) — sem bash |
| `boot-sync` | Task Scheduler no logon |

## Cursor CLI

```powershell
npm run cursor-cli -- install
npm run cursor-cli -- status
npm run cursor-cli -- login
# headless: agent -p --force "prompt" + CURSOR_API_KEY
```

## Relacionados

- [README monorepo](../../README.md)
