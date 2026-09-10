# Shared AI — status

Baseline concluída. Índice: [docs/okf/index.md](docs/okf/index.md).

## Concluído (esta onda)

| Área | Entrega |
| --- | --- |
| Escopo DND Work | Skills P0–P2 (Nest, FSD, Supabase, TypeORM, shadcn, …); perfis `nestjs` / `next` / `react` / `monorepo` |
| Orquestrador | Rules padronizadas (base / intent / stack / globs) |
| Automations | `/automations` + template de sync Shared AI (sem review/CI) |
| Scaffold | `/criar-skill`, `/criar-rule` + templates |
| Release | `CHANGELOG.md` + `npm run release` |
| Limpeza | Remoto/cloud, review, HubSpot, stacks fora do escopo |

Skills de domínio DND (`dnd-router`, etc.) ficam nos repos `dnd-*`.

## Manutenção

- [ ] Na máquina: `npm run setup:skills` ou `npm run sync` para publicar em `~/.cursor`

## Docs vivas

| Doc | Uso |
| --- | --- |
| [docs/okf/index.md](docs/okf/index.md) | Índice OKF |
| [docs/okf/dashboard-web.md](docs/okf/dashboard-web.md) | Dashboard local |
| [docs/okf/supabase-local.md](docs/okf/supabase-local.md) | Docker Auth |
| [docs/okf/windows.md](docs/okf/windows.md) | Windows |
| [docs/okf/docs-conventions.md](docs/okf/docs-conventions.md) | Convenções OKF |
| [CHANGELOG.md](CHANGELOG.md) | Releases |
