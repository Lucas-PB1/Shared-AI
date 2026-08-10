# Backlog HostDime IA

Melhorias priorizadas do pacote. Atualize ao concluir itens ou repriorizar.

## P0 — concluído

- [x] **`/onboard`** — wizard de primeira configuração (setup, perfil, bootstrap, extras)
- [x] **`CHECKLIST.md`** — backlog versionado
- [x] **Perfis `next`, `python`, `zend-laminas`** — rules de projeto para stacks já detectadas pelo orquestrador

## P1 — concluído

- [x] **`npm run health`** — saúde multi-projeto (symlinks, git dirty, review inbox, versão)

## P2 — próximo

- [ ] **Framework MCP genérico** — generalizar `/hubspot-mcp` para outros servidores
- [x] **Pre-commit + `review:ci`** — hook local estático nos staged (`review-pre-commit` / `hooks:pre-commit`)
- [ ] **Paridade Windows** — `review:ci` nativo PowerShell (hoje pre-commit exige bash/Git Bash)

## P3 — futuro

- [ ] **Pipelines Cursor SDK** — agent no CI para `/avaliar-diff` em MRs
- [ ] **Cursor Automations** — templates prontos no pacote
- [ ] **Memória cross-projeto** — agregar padrões de `context.yaml` / `convencoes.md` entre repos
- [ ] **Perfil `monorepo`** — roteamento por workspace/pacote
- [ ] **`/criar-skill` e `/criar-rule`** — scaffolding com templates hostdime
- [ ] **Release automation** — VERSION + changelog a partir do histórico

## Manutenção contínua

- [ ] Testes bats para novos perfis e detect-stack em monorepos
- [x] Documentar onboarding “só skills” vs “skills + code-review” no README
- [ ] Smoke test: todo perfil tem `SKILLS-ROUTING.md` + `*-project.mdc`

## Plano de saúde

Ver [docs/PLANO-SAUDE.md](docs/PLANO-SAUDE.md).

- [x] **Fase 1 — Fundação** — locks versionados, CI `npm ci`, docs de testes e onboarding
- [x] **Fase 2 — Defesa** — smoke review-diff/ci/inbox/export/ingest; `lint:shell` / `lint:ts`
- [x] **Fase 3** — domínio review em TypeScript (`src/` + `bin/`) + unit Node
- [x] **Fase 4 (parcial)** — pre-commit estático sem LLM (`hooks:pre-commit` / `review-pre-commit`)

## Plano — Modular Slices

Ver [docs/PLANO-MODULAR-SLICES.md](docs/PLANO-MODULAR-SLICES.md). Estrutura do monorepo: contextos = pacotes; dentro = fatias de capacidade; store/gh/fs = adaptadores.

- [x] **S0** — Plano + linguagem ubíqua + layout alvo
- [x] **S1** — `packages/code-review/src/shared/` (ids, markers, snippets, dotenv)
- [x] **S2** — fatia `memory/` (partir `memoria.ts` / `memoria-core.ts`)
- [x] **S3** — fatias `ingest/` + `report/`
- [x] **S4** — fatia `store/` com port + dual-write (habilita U1)
- [x] **S5** — reagrupar `packages/cursor/scripts/lib/`
- [x] **S6** — consolidar tools Node restantes (LLM/skill-routing → TS)

## Plan — Review unificado (Supabase)

Ver [docs/PLANO-REVIEW-UNIFICADO.md](docs/PLANO-REVIEW-UNIFICADO.md) e [docs/supabase-local.md](docs/supabase-local.md).

- [x] **U0 (parcial)** — Supabase local Docker, migration, plano, store + smoke TypeScript
- [x] **Python → TypeScript** — code-review + helpers cursor (tsx); zero runtime Python no monorepo
- [x] **U1 (parcial)** — dual-write soft: `store/dual-write.ts`, ingest PR + `npm run review:dual-write`; offline sem env
- [x] **U2** — publish no CI (`review-store-publish`, secrets + steps no template)
- [x] **U3** — memória/exclusões do store (pull/push + merge no LLM; export slim)
- [x] **U4** — guia cloud + `REVIEW_STORE_REQUIRED` (hard opcional por repo)
