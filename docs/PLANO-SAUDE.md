# Plano de saúde — HostDime IA

Plano derivado da avaliação de saúde de **2026-08-10**. Objetivo: elevar o pacote de “operacionalmente estável” para “reproduzível, testado no núcleo de review e fácil de evoluir”.

| Campo | Valor |
| --- | --- |
| Baseline | ~8/10 — instalação OK, CI verde, 111 testes OK |
| Versão alvo deste plano | 0.3.x (hardening) → 0.4.0 (pós-fases 1–2) |
| Fonte viva | [CHECKLIST.md](../CHECKLIST.md) |
| Critério de conclusão | checklists por fase; CI verde; `npm run doctor` e `npm test` limpos |

---

## Visão em fases

```text
Preparação (0)
    │
    ▼
Fase 1 — Fundação (locks, docs, higiene)
    │
    ▼
Fase 2 — Defesa no CI e local (shellcheck dev, smoke review)
    │
    ▼
Fase 3 — Qualidade do núcleo review (testes + modularização)
    │
    ▼
Fase 4 — DX e produto (pre-commit, Windows, backlog P2/P3)
```

| Fase | Nome | Esforço estimado | Resultado |
| --- | --- | --- | --- |
| **0** | Preparação | 0,5–1 dia | branch, baseline, critérios de aceite |
| **1** | Fundação | 1–2 dias | builds reproduzíveis e docs alinhadas |
| **2** | Defesa | 2–4 dias | smoke nos fluxos de review + feedback local |
| **3** | Núcleo review | 1–2 semanas | menos risco em scripts grandes; cobertura | 
| **4** | DX / produto | contínuo | P2/P3 do backlog sem regredir o baseline |

Fases **0–2** são sequenciais. **3** e **4** podem avançar em paralelo após a **2**, desde que mudanças em `review-*.sh|py` passem pelo smoke da fase 2.

---

## Fase 0 — Preparação

Antes de mudar código: alinhar o que será feito e como validar.

### Objetivos

- Congelar o baseline de saúde
- Evitar PRs monólitos
- Deixar decisões explícitas (locks, escopo de testes)

### Checklist de preparação

- [x] Working tree limpa ou WIP em stash
- [x] Branch de trabalho: `plan/saude-fase-1` (ou trabalho em main conforme PR)
- [x] Baseline local: doctor + test (2026-08-10 — 111 ok)
- [x] CI recente em `main` verde
- [x] Escopo da fase 1: **B** (package-lock + composer.lock)
- [x] Fora de escopo da fase 1: features de produto (MCP, SDK, monorepo)

### Saídas da fase 0

| Artefato | Onde |
| --- | --- |
| Plano aprovado | este arquivo |
| Decisão de locks | **B** — ambos os locks versionados |
| Baseline de testes | 111 ok |

### Notas / decisões

| Decisão | Opção | Data | Autor |
| --- | --- | --- | --- |
| Locks no git | **B** (npm + composer) | 2026-08-10 | plano de saúde |
| Escopo smoke review | adiado para fase 2 | 2026-08-10 | |

---

## Fase 1 — Fundação (reprodutibilidade e higiene)

### Problema

`package-lock.json` e `composer.lock` estão no `.gitignore`. CI e máquinas instalam versões potencialmente diferentes. `tests/README.md` não descreve a suite real (`run-embedded.sh`).

### Objetivos

1. Builds npm/composer reproduzíveis
2. Documentação de testes atualizada
3. Higiene mínima de artefatos locais

### Preparações específicas

- [x] Escopo B (locks npm + composer) decidido
- [x] CI migrado para `npm ci` + cache npm
- [x] Validação local com `npm ci` e `composer install` (ver histórico)

### Trabalho

| # | Item | Arquivos | Status |
| --- | --- | --- | --- |
| 1.1 | Parar de ignorar `package-lock.json` | `.gitignore` | feito |
| 1.2 | Versionar `composer.lock` (opção B) | `.gitignore`, lock | feito |
| 1.3 | CI: `npm ci` | `.github/workflows/ci.yml` | feito |
| 1.4 | Atualizar `tests/README.md` | `tests/README.md` | feito |
| 1.5 | `__pycache__/` ignorado | `.gitignore` | ok (já existia) |
| 1.6 | README: onboarding só skills vs + review | `README.md` | feito |

### Validação

```bash
npm ci
composer install
npm test
npm run doctor
```

### PR sugerido

- Título: `chore: versionar locks e alinhar docs de testes`
- Escopo: só fase 1 (sem refatoração de review)

### Saída

- [x] Itens 1.1–1.6 no código + docs
- [ ] PR mergeado em `main`
- [x] CHECKLIST / este plano: marcar itens da fase 1

---

## Fase 2 — Defesa (CI/local e smoke do review)

### Problema

O pipeline de code-review (scripts grandes) tem baixíssima cobertura. ShellCheck existe no CI, mas não no fluxo local padrão. Regressões recentes (SHAs pinados, ingest) mostram o valor de smoke tests.

### Objetivos

1. Smoke automatizado nos scripts críticos do review
2. Feedback ShellCheck mais próximo do dev (sem depender só do push)
3. Não bloquear merge sem critério claro (falha = regression real)

### Preparações específicas

- [x] Mapear caminhos de entrada dos tools (args, env, cwd de projeto fake)
- [x] Inventário mínimo de smoke — sem rede / sem `gh` / sem LLM
- [x] Fixtures em `tests/fixtures/review/`
- [x] Smoke **não** chama API LLM real

### Inventário de smoke (mínimo)

| Script / fluxo | Tipo de teste | Status |
| --- | --- | --- |
| `review-ci.sh` | diff vazio + arquivo limpo | feito |
| `review-diff.sh` | lista range em git temp | feito |
| `check-inbox.sh` | JS limpo + mock semgrep | feito |
| `review-export-exclusions.sh` | export de `context.yaml` fixture | feito |
| `review-ingest-pr-decisions` | `tests/smoke_review_ingest.py` (classify/parsers) | feito |
| `review-github-pr.sh` | adiado (precisa gh/PR) | fase 3 / e2e opcional |
| `review-memoria.py` | já em suite (migrar/restore) | feito (pré-existente) |

### Trabalho

| # | Item | Status |
| --- | --- | --- |
| 2.1 | Fixture de projeto review | feito |
| 2.2 | Suite smoke `review-ci` + `review-diff` | feito |
| 2.3 | Smoke `check-inbox` / export exclusions | feito |
| 2.4 | Smoke Python ingest | feito |
| 2.5 | Documentar secrets LLM no CI README | feito |
| 2.6 | `npm run lint:shell` | feito |
| 2.7 | `npm run lint:python` + step no CI | feito |

### Validação

```bash
npm test
npm run lint:shell
npm run lint:python
```

### Saída

- [x] Smoke do núcleo review no `npm test`
- [x] Dev consegue lintar shell como o CI (`npm run lint:shell`)
- [ ] PR mergeado em `main`
---

## Fase 3 — Núcleo review (cobertura e modularização)

### Problema

Scripts monólitos aumentam custo de mudança:

| Arquivo | Ordem de tamanho |
| --- | --- |
| `review-memoria.py` | ~1100 linhas |
| `review-github-pr.sh` | ~1000 linhas |
| `review-ingest-pr-decisions.py` | ~570 linhas |
| `sync-inbox.sh` (cursor) | ~530 linhas |

### Objetivos

1. Extrair funções testáveis (parse, ranking, IDs estáveis, merge de decisões)
2. Cobrir com testes unitários o que a fase 2 só fumaça
3. Reduzir risco de regressão em features novas de review

### Preparações específicas

- [x] Fase 2 mergeada (smoke como rede de segurança)
- [x] Lógica pura em Python (`lib/`); shell continua orquestrando
- [x] Extrair 1 peixe por PR (ingest + finding_ids nesta entrega)

### Ordem de trabalho sugerida

1. **`review-ingest-pr-decisions.py`** — `lib/ingest_decisions.py` *(feito)*
2. **`review-github-pr.sh`** — `lib/pr_report.py` *(feito para regras; gh I/O no shell)*
3. **`review-memoria.py`** — `lib/memoria_core.py` *(feito para escopo/convencoes/merge)*
4. **`review-llm.mjs` / skill-routing** — unit tests Node *(feito)*

### Trabalho (iterativo)

| # | Item | Status |
| --- | --- | --- |
| 3.1 | Extrair módulo de regras de decisão (ingest) | feito |
| 3.2 | Extrair helpers de `finding_id` | feito |
| 3.3 | Reduzir shell “gordo” (github-pr) | feito (regras em lib; shell orquestra) |
| 3.4 | Cobertura de regressão | feito |
| 3.5 | Docs `tools/README.md` | feito |
| 3.6 | `memoria_core` + skill-routing/LLM unit | feito |

### Validação

```bash
npm run test:review-unit
npm test
npm run lint:python
```

### Saída

- [x] Núcleo de regras com testes unitários (ingest, ids, pr_report, memoria, routing/llm)
- [ ] PR mergeado em `main`

---

## Fase 4 — DX e produto (backlog P2/P3)

Só após baseline de fundação + defesa. Itens do [CHECKLIST.md](../CHECKLIST.md), reordenados pelo risco/benefício.

### P2 — próximo (produto/DX)

| Item | Pré-requisitos | Nota |
| --- | --- | --- |
| Pre-commit + `review:ci` | fase 2 (smoke) | alinhar ao CI; não rodar LLM no hook |
| Paridade Windows `review:ci` | pre-commit/docs Windows | PowerShell nativo; ver [WINDOWS.md](WINDOWS.md) |
| Framework MCP genérico | mapear servidores desejados | generalizar `/hubspot-mcp` |

### P3 — futuro

| Item | Pré-requisitos |
| --- | --- |
| Pipelines Cursor SDK no CI | secret, política de custo, fase 2 |
| Cursor Automations templates | docs + exemplos |
| Memória cross-projeto | schema estável de `convencoes` / exclusions |
| Perfil `monorepo` | detect-stack multi-package + testes |
| `/criar-skill` e `/criar-rule` | templates em `packages/cursor/templates` |
| Release automation | VERSION + changelog; tags |

### Manutenção contínua (paralelo a qualquer fase)

| Item | Quando |
| --- | --- |
| Testes bats para novos perfis / monorepo | ao adicionar perfil |
| Smoke: cada perfil tem `SKILLS-ROUTING.md` + `*-project.mdc` | CI leve pós-fase 1 |
| `npm outdated` pontual (eslint/ts) | após fase 1; upgrades majors planejados |
| Limpeza do registry `health` (paths não-git) | cosmético; low priority |

### Preparações por item P2

**Pre-commit + review:ci**

- [ ] Definir ferramentas no hook (shellcheck? só files do stage?)
- [ ] Timeout e skip para monorepos enormes
- [ ] Doc no README: “como desligar / instalar”

**Paridade Windows**

- [ ] Inventário de bash-only em `review-ci` e deps
- [ ] Máquina ou CI Windows opcional
- [ ] Atualizar [WINDOWS.md](WINDOWS.md)

**MCP genérico**

- [ ] Lista de servidores (args, auth, `mcp.json` shape)
- [ ] Manter HubSpot como primeiro driver, sem quebrar install atual

---

## Critérios de saúde pós-plano

Quando fases **1–2** estiverem fechadas, a meta de “saudável reforçado” é:

| Métrica | Hoje | Alvo pós 1–2 |
| --- | --- | --- |
| `npm test` | 111 ok | ≥111 + smokes novos, 0 falha |
| Locks versionados | não | sim (`package-lock`; composer se B) |
| Cobertura tools review | baixa | smoke nos scripts críticos |
| CI | verde | verde + `npm ci` |
| Docs testes | defasadas | alinhadas ao runner |
| `doctor` / instalação | OK | OK (sem regressão) |

Quando fase **3** fechar:

| Métrica | Alvo |
| --- | --- |
| Bugs de regra de ingest/resumo | cobertos por teste nomeado |
| Tamanho dos mains shell | tendência de redução; libs extraídas |

---

## Como executar dia a dia

```bash
# baseline
npm run doctor && npm test

# por fase: branch + PR pequeno
git checkout -b plan/saude-fase-1
# ... trabalho ...
npm test
# abrir PR com o recorte da fase

# após merge e pull nos consumidores
git pull && npm run sync && npm run status
```

Convenções:

- Um PR = uma fase ou um sub-item de fase (nunca misturar lock + refatoração monólito)
- Atualizar este arquivo e o [CHECKLIST.md](../CHECKLIST.md) ao concluir itens
- Não pular fase 0: sem critério de aceite, o plano vira backlog sem entrega

---

## Ordem de PRs sugerida

1. `chore: locks + CI npm ci + docs testes` (fase 1)
2. `test: smoke review-ci/diff/inbox` (fase 2a)
3. `test: smoke ingest + lint:shell` (fase 2b)
4. `refactor(test): extrair regras de ingest` (fase 3a)
5. `refactor: helpers finding_id / resumo PR` (fase 3b)
6. PRs de P2 sob demanda (pre-commit, Windows, MCP)

---

## Fora de escopo deste plano

- Features de produto não listadas (novas skills de stack, etc.)
- Limpeza git dirty dos **projetos registrados** (hostdime, hdbr-payment) — é saúde dos consumers, não do pacote
- Upgrade major ESLint 10 / TypeScript 7 — planejar à parte após locks versionados
- Release 1.0 / marketing

---

## Histórico

| Data | Evento |
| --- | --- |
| 2026-08-10 | Avaliação de saúde; criação deste plano |
| 2026-08-10 | Fase 0 decidida (locks B); fase 1 implementada (locks, npm ci, docs) |
| 2026-08-10 | Fase 2 implementada (smoke review, lint:shell, lint:python) |
| 2026-08-10 | Fase 3 parcial: `lib/finding_ids` + `lib/ingest_decisions` + unittest |
| 2026-08-10 | Fase 3.3: `lib/pr_report` + CLI `review-pr-report.py` (resumo/veredito) |
| 2026-08-10 | Fase 3 restante: `memoria_core` + testes skill-routing/llm |
