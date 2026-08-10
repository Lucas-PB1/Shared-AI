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
- [ ] **Pre-commit + `review:ci`** — hook local alinhado ao CI
- [ ] **Paridade Windows** — `review:ci` nativo PowerShell (hoje exige Git Bash)

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
- [x] **Fase 2 — Defesa** — smoke review-diff/ci/inbox/export/ingest; `lint:shell` / `lint:python`
- [x] **Fase 3.1–3.2 / 3.4–3.5** — `lib/ingest_decisions` + `finding_ids` + unit tests (github-pr shell: pending)
