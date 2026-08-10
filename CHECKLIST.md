# Backlog HostDime IA

Itens **abertos**. Arquitetura e store: [docs/README.md](docs/README.md).

## Concluído (referência — não reabrir como plano)

| Área | Resultado |
| --- | --- |
| Saúde / locks / smoke / lint | package-lock + composer.lock, smoke review, `lint:shell`, `lint:ts` |
| Modular Slices S0–S6 | `src/{shared,memory,ingest,report,store,llm,skill-routing}/` + cursor `scripts/lib/*` |
| Review store U0–U4 (código) | Supabase local, dual-write/publish/memory **hard**, CI template, guia cloud |
| Onboard, health, pre-commit estático | `npm run onboard` / `health` / `hooks:pre-commit` |
| Python runtime no monorepo | removido — TS + bash |

## P2 — próximo

- [ ] **Framework MCP genérico** — generalizar `/hubspot-mcp` para outros servidores
- [ ] **Paridade Windows** — `review:ci` / pre-commit nativo PowerShell (hoje bash/Git Bash/WSL)

## P3 — futuro

- [ ] **Pipelines Cursor SDK** — agent no CI além do template atual
- [ ] **Cursor Automations** — templates no pacote
- [ ] **Memória cross-projeto (UI)** — vista agregada multi-slug (dados já em `projects` no store; app fora do monorepo)
- [ ] **Perfil `monorepo`** — roteamento por workspace/pacote
- [ ] **`/criar-skill` e `/criar-rule`** — scaffolding com templates hostdime
- [ ] **Release automation** — VERSION + changelog
- [ ] **Gateway HTTP** HostDime na frente do Supabase (opcional)

## Manutenção contínua

- [ ] Testes bats para novos perfis e detect-stack em monorepos
- [ ] Smoke: todo perfil tem `SKILLS-ROUTING.md` + `*-project.mdc`
- [x] Ops: cloud `toekmpljxeulcquqhkxt` — schema + dados alinhados ao local; monorepo `.env` com `SUPABASE_URL` + service_role
- [ ] Ops: secrets `SUPABASE_*` / `REVIEW_PROJECT_SLUG` nos repos cliente (CI)

## Docs vivas

| Doc | Uso |
| --- | --- |
| [docs/okf/index.md](docs/okf/index.md) | Índice do knowledge bundle OKF |
| [docs/okf/review-store.md](docs/okf/review-store.md) | Contrato do store |
| [docs/okf/supabase-local.md](docs/okf/supabase-local.md) | Dev local |
| [docs/okf/supabase-cloud.md](docs/okf/supabase-cloud.md) | Cloud / CI secrets |
| [docs/okf/windows.md](docs/okf/windows.md) | Windows |
| [docs/okf/docs-conventions.md](docs/okf/docs-conventions.md) | Como escrever docs (OKF) |
| [packages/code-review/STRUCTURE.md](packages/code-review/STRUCTURE.md) | Fatias do pacote |
