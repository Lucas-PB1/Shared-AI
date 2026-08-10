# Plano — Modular Slices

Organizar o monorepo **hostdime-ia** por **contextos (pacotes)** e, dentro de cada um, por **fatias de capacidade** (vertical slices), com **ports/adapters** só na borda de I/O.

| Campo | Valor |
| --- | --- |
| Nome | **Modular Slices** |
| DDD | Só **estratégico** (contextos + linguagem ubíqua) — sem Aggregates/Repository cerimoniais |
| Clean / Hexagonal | **Regra de dependência** + ports na borda (store, gh, fs, shell) |
| Vertical slice | **Organização padrão** do TypeScript por capacidade |
| Plataformas | Linux (bash) + Windows (PowerShell) — sem dual stack de lógica |
| Relacionados | [PLANO-REVIEW-UNIFICADO.md](PLANO-REVIEW-UNIFICADO.md), [STRUCTURE.md](../packages/code-review/STRUCTURE.md) |

---

## Problema

| Hoje | Dor |
| --- | --- |
| `packages/code-review/src/` flat | Capacidade espalhada (`memoria.ts` monólito, imports cruzados) |
| `bin/` + `tools/` + `src/` sem contrato claro | Diffícil saber o que é domínio vs orquestração |
| Pendências U1–U4 do store | Feature nova sem “casa” — risco de dual-write solto em qualquer arquivo |
| `packages/cursor/scripts/lib/` baguncada | ~~Helpers por tipo de arquivo~~ → **S5**: subpastas por capacidade (`shared`, `history`, `sync-inbox`, `hubspot`, `profiles`, `install`) |
| Padrão implícito | Cada PR inventa pasta; residual cresce |

---

## Decisão (registrada)

**Não** adotar DDD tático puro nem clean architecture em 7 anéis em todo o monorepo.

**Adotar:**

1. **Bounded contexts = packages** (`cursor` | `code-review` | `supabase` schema)
2. **Dentro do pacote = vertical slices** (feature/capacidade end-to-end)
3. **Shared kernel mínimo** (`shared/`) só após 2–3 repetições comprovadas
4. **Adaptadores** = CLI (`bin/`), shell/ps1 (`tools/`, `scripts/`), client REST store, GitHub API

### Regras de dependência (immutáveis)

```text
bin/tools/shell  →  fatia (API pública)  →  shared
                         ↓
                    port (interface)
                         ↓
                    adapter (supabase | fs | gh)
```

1. Fatia **A** não importa internals de fatia **B** — só `index` público ou `shared/`.
2. Núcleo da fatia **não** conhece HTTP, `gh`, path absoluto de monorepo, secrets.
3. Shell/PowerShell **só orquestra**; lógica e shape de dados em TypeScript.
4. **Sem** pasta de compat, dual stack, ou código “só porque o arquivo antigo existia”.
5. Testes da fatia rodam isolados; CI continua `lint:ts` + `test:review-unit` + embedded.

### Linguagem ubíqua por contexto

| Contexto | Pacote | Termos |
| --- | --- | --- |
| **cursor-bootstrap** | `packages/cursor` | profile, link, health, hooks, historico, sync-inbox |
| **review-memory** | `packages/code-review` (slice memory) | decision, exclusion, convention, context, compactar, promover |
| **review-report** | slice report | finding, veredito, De/Para, inline marker, finding_key |
| **review-ingest** | slice ingest | thread, PR, decision from merge |
| **review-store** | slice store + `supabase/` | project, run, membership, RLS, dual-write |
| **review-ci** | `tools/` + CI | pre-commit, review-github-pr, check-inbox |

Não misturar vocabulário de install (bootstrap) com decisão de review.

---

## Layout alvo

### Monorepo

```text
hostdime-ia/
├── packages/
│   ├── cursor/                 # contexto: bootstrap + tooling Cursor
│   └── code-review/            # contexto: review oficial + memória + store client
├── supabase/                   # schema + RLS (fonte de verdade do modelo de dados)
├── docs/
│   ├── PLANO-MODULAR-SLICES.md # este plano
│   ├── PLANO-REVIEW-UNIFICADO.md
│   └── ...
└── tests/                      # integração / smoke do monorepo
```

### `packages/code-review` (prioridade)

```text
packages/code-review/
├── bin/                        # thin CLI: parse args → chamar fatia
│   ├── review-memoria.ts
│   ├── review-ingest-pr-decisions.ts
│   ├── review-export-exclusions.ts
│   ├── review-pr-report.ts
│   ├── review-store-smoke.ts
│   └── review-llm.ts
├── src/
│   ├── shared/                 # kernel estável
│   │   ├── finding-ids.ts
│   │   ├── markers.ts
│   │   ├── snippets.ts
│   │   └── dotenv.ts
│   ├── memory/                 # fatia: init, decisions, compactar, promover, backup
│   │   ├── index.ts            # API pública da fatia
│   │   ├── context-yaml.ts
│   │   ├── decisions-io.ts
│   │   ├── merge.ts            # (hoje memoria-core)
│   │   └── cmds.ts
│   ├── ingest/                 # fatia: threads PR → decisions
│   │   ├── index.ts
│   │   └── from-pr.ts
│   ├── report/                 # fatia: veredito PR, helpers inline
   │   ├── index.ts
   │   └── pr-report.ts
   ├── store/                  # porta + adapter Supabase
   │   ├── port.ts
   │   ├── supabase-client.ts
   │   ├── config.ts
   │   └── dual-write.ts
   ├── skill-routing/          # path → skills/rules
   └── llm/                    # providers + prompt /avaliar
├── tools/                      # Bash wrappers + static (sem mjs de domínio)
├── tests/                      # espelhar fatias
├── commands/ skills/ ci/ templates/
└── STRUCTURE.md                # sempre o layout **atual** (atualizar a cada fase)
```

### `packages/cursor` (segunda onda)

```text
packages/cursor/scripts/
├── lib/
│   ├── shared/                 # json-io, hooks-platform, cli-entry
│   ├── profiles/
│   ├── history/                # history-watch, merge hooks historico
│   ├── sync-inbox/
│   ├── hubspot/
│   └── install/                # registry, boot-sync helpers
├── *.sh                        # entrypoints Linux
└── ps1/                        # entrypoints Windows (mesma semântica, zero lógica nova)
```

### O que fica **fora** de fatia de domínio

| Pasta | Papel |
| --- | --- |
| `commands/`, `skills/` | Prompt para o agent — não domínio |
| `tools/*.sh` | Adapter de processo / CI |
| `supabase/migrations` | Persistência oficial do modelo |
| `packages/cursor/skills/*` | Biblioteca genérica de skills (não é app) |

---

## Fases de migração

Critério global: **cada fase mergeável**, testes verdes (`lint:ts`, `test:review-unit`, suite embutida ou bats). Sem big-bang.

### S0 — Decisão e mapa (este documento)

| Item | Aceite |
| --- | --- |
| Plano versionado | Este arquivo |
| CHECKLIST aponta para o plano | item S0–S4 |
| STRUCTURE.md cita Modular Slices e estado **atual** vs alvo | alinhado |

### S1 — Extract `shared/` (code-review)

| Item | Aceite |
| --- | --- |
| Mover `finding-ids`, `markers`, `snippets`, `dotenv` → `src/shared/` | **feito** |
| Reexports ou update de imports em `bin/` e fatias | **feito** (`shared/index.ts`) |
| Zero mudança de comportamento | **feito** (unit + lint) |

### S2 — Fatia `memory/`

| Item | Aceite |
| --- | --- |
| Partir `memoria.ts` + `memoria-core.ts` em módulos da fatia | **feito** |
| `src/memory/index.ts` = API pública | **feito** |
| `bin/review-memoria.ts` só chama a fatia | **feito** |
| Testes em `tests/memory/` (ou paths atualizados) | **feito** (`merge.test.ts`) |
| CLI `init/backup/restore/compactar/promover` idêntica ao usuário | **feito** |

### S3 — Fatias `ingest/` + `report/`

| Item | Aceite |
| --- | --- |
| `ingest-decisions.ts` → `src/ingest/` | **feito** (`from-pr.ts` + `index.ts`) |
| `pr-report.ts` → `src/report/` | **feito** |
| Bins e tests atualizados | **feito** (`tests/ingest/`, `tests/report/`) |
| Imports cross-slice só via `shared` ou API pública | **feito** |

### S4 — Fatia `store/` com **port**

| Item | Aceite |
| --- | --- |
| `port.ts` com operações do domínio U0/U1 | **feito** (`ReviewStorePort`) |
| Adapter Supabase implementa a port | **feito** (`supabase-client.ts`) |
| `dual-write.ts` usado por memory + ingest (não o contrário) | **feito** (ingest CLI + `review-dual-write` para finalizar/replay) |
| U1 do plano unificado implementado **dentro** da fatia store | **parcial** (soft dual-write; hard unification = U2+) |

### S5 — `cursor` reagrupar `lib/`

| Item | Aceite |
| --- | --- |
| Agrupar shared / history / sync-inbox / profiles / hubspot / install | **feito** |
| `run.mjs` e PS1 sem mudança de contrato npm | **feito** |
| Referências (tests, hooks, docs) atualizadas | **feito** |

### S6 — Tools Node restantes

| Item | Aceite |
| --- | --- |
| `review-llm` / skill-routing → TS (`src/llm/`, `src/skill-routing/`) | **feito** |
| Entrypoint via `tools/review-llm.sh` + `_tsx.sh` / bin TS | **feito** |
| Unit tests sob `tests/llm/` e `tests/skill-routing/` | **feito** |

---

## Ordem recomendada vs backlog store

```text
S0 ──► S1 ──► S2 ──► S3 ──► S4 (+ U1 dual-write)
                      │
                      └── S5 (cursor) em paralelo se recursos
S6 quando for tocar no LLM pipeline
U2–U4 do store **depois** de S4 (port existindo)
```

Não implementar dual-write U1 **antes** de a porta `store` existir: evita gravar HTTP no meio de `memoria.ts`.

---

## Contratos públicos (mínimo por fatia)

| Fatia | Exportar em `index.ts` (exemplos) |
| --- | --- |
| **shared** | `stableFindingId`, `buildInlineMarkerHtml`, `normalizeSnippet`, load dotenv |
| **memory** | `cmdInit`, `cmdStatus`, `cmdCompactar`, `cmdPromover`, `cmdBackup`, `cmdRestore`, `loadContext`, `buildContext`, `readMergedDecisions`, `writeDecisions` |
| **ingest** | `decisionFromThread`, merge/re-ingest rules, types |
| **report** | helpers de veredito, marker de report, format table |
| **store** | `loadConfig`, client ops via **port**, `dualWriteDecision` |
| **skill-routing** | `matchGlob`, `scopeMatchesFile`, `resolveSkillIds`, `resolveContextForFile` |
| **llm** | `parseArgs`, `inferStack`, `buildUserPrompt`, `callLLM`, `runLlmReview` |

Bins importam **só** de `../src/<fatia>/index.js` (ou reexport central se necessário).

---

## Anti-padrões (bloqueio em review)

- Pasta `domain/` / `application/` / `infrastructure/` vazia “por clean”
- Fatia por tecnologia (`slice-bash`, `slice-ts`)
- `shared/` como lixeira de qualquer util
- Import `../../memory/context-yaml.js` a partir de `ingest` (vazar internal)
- Comentários ou paths “compat / paridade / old”
- Nova lógica em `tools/*.sh` além de glue

---

## Checklist de PR por fatia

- [ ] Mudança típica da capacidade toca **uma** pasta `src/<fatia>/` (+ bin se CLI)
- [ ] `index.ts` da fatia documenta o que é público
- [ ] Testes da fatia no CI
- [ ] Sem dependência circular entre fatias
- [ ] STRUCTURE.md atualizado se o layout mudou

---

## Métricas de progresso

| Sinal | Meta |
| --- | --- |
| Arquivos em `src/` raiz (fora pastas de fatia) | → 0 (exceto reexport opcional) |
| LOC do maior módulo de memória | ↓ (hoje ~memoria monólito) |
| Dual-write fora de `store/` | 0 |
| Referências a formatos mortos | 0 (já política do monorepo) |

---

## Fora de escopo deste plano

- Dashboard multi-user (U4) — só estrutura para suportar
- SDK Cursor pipelines / Automations — P3 no CHECKLIST
- Reescrever skills genéricas sob Modular Slices (permanecem biblioteca)
- Mudar contrato npm dos scripts públicos

---

## Próximo passo imediato

1. Marcar **S0** concluído no [CHECKLIST](../CHECKLIST.md).
2. Executar **S1** (`src/shared/`) em um PR pequeno, sem features novas.
3. Em seguida **S2** (`memory/`) — maior ROI antes de U1.
