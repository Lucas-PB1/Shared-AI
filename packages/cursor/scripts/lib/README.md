# scripts/lib — fatias do motor Cursor

Cada fatia agrupa por linguagem quando há mais de um tipo de arquivo:

| Fatia | Layout |
| --- | --- |
| `install/` | `sh/`, `ts/`, `conf/` |
| `hubspot/` | `sh/`, `ts/` |
| `profiles/` | `sh/`, `ts/` |
| `sync-inbox/` | `sh/`, `ts/` |
| `history/` | só TypeScript (flat) |
| `shared/` | só TypeScript (flat) |

Entry shell do monorepo: `packages/cursor/scripts/sh/*`.
Dispatcher: `packages/cursor/scripts/mjs/run.mjs`.
PowerShell: `packages/cursor/scripts/ps1/`.
