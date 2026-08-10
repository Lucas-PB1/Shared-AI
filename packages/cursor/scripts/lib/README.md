# Cursor scripts `lib/` — Modular Slices

Helpers do pacote **cursor** por capacidade (não por extensão).

```text
lib/
├── shared/       # json-io, hooks-platform, cli-entry
├── history/      # history-watch-match, merge-historico-hooks
├── sync-inbox/   # scan/cards/query + sync-inbox.sh
├── hubspot/      # hubspot-mcp
├── profiles/     # detect-stack, profiles.sh, apply-bootstrap-profile
└── install/      # env, registry, link, gitignore, hooks merge, health, cursor-cli, boot-sync
```

Entry points públicos (`install.sh`, `run.mjs`, commands npm) **não mudam** — só os paths internos da lib.

Ver [docs/PLANO-MODULAR-SLICES.md](../../../docs/PLANO-MODULAR-SLICES.md) (fase S5).
