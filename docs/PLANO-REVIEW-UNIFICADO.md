# Plano — Review unificado + store Supabase

Unificar o code-review **local (Cursor)** e **remoto (CI/GitHub)** com um **store central multi-usuário** (Supabase). Fonte de verdade de runs, findings e decisões deixa de ser só arquivo em `.cursor/review/`.

| Campo | Valor |
| --- | --- |
| Decisão store | **Supabase** (muitos usuários, RLS, API REST) |
| Entrada de escrita | **Modelo B** — dev (JWT/service local) + CI (service role) |
| Unificação | **Hard** — agent livre no chat; runs/decisões oficiais só via CLI/API |
| Ambiente agora | **Supabase local (Docker)** antes do projeto cloud |
| Schema versionado | [`supabase/migrations/`](../supabase/migrations/) — DDL only, sem dados de clientes |
| Plano de saúde | [PLANO-SAUDE.md](PLANO-SAUDE.md) (fases 1–4 já em grande parte OK) |

---

## Problema

| Hoje | Dor |
| --- | --- |
| Local grava `decisions.jsonl` / reports em markdown | CI grava markers/ingest em fluxos paralelos |
| Memória versionada no cliente (`exclusions`, `convencoes`) | Não há visão multi-repo HostDime |
| Agent pode “finalizar” só no chat | Dados oficiais incompletos |

---

## Arquitetura alvo

```text
                    ┌─────────────────────────┐
  Cursor /avaliar   │  Agent (chat livre)     │
  /finalizar        │  skills, De/Para, texto │
        │           └───────────┬─────────────┘
        │                        │ "oficial" só via CLI
        ▼                        ▼
  review-* tools  ──API (JWT / service)──►  Supabase
  (static+LLM)    ◄── query memory ──────   (projects, runs,
        ▲                                    findings, decisions,
        │                                    exclusions, conventions)
  GitHub Actions ──service_role──────────►
  review-github-pr / ingest
```

### Princípios

1. **TypeScript-first** para o núcleo do code-review: `packages/code-review/src/` + `bin/` (tsx). Layout e migração por fatias: [PLANO-MODULAR-SLICES.md](PLANO-MODULAR-SLICES.md) e [STRUCTURE.md](../packages/code-review/STRUCTURE.md).
2. **Dois drivers**: local (Cursor) e CI — mesmos shapes de run/finding/decision.
3. **Store = fonte de verdade**; arquivos locais = cache/export opcional (git do cliente).
4. **Privacidade**: snippets de código só no Supabase (projeto privado). Migration e código no git **sem rows de clientes**. Export versionável: `exclusions` (finding_key + reason + scope), não `de_code`/`para_code`.
5. **Stack**: TypeScript (IDs, PR report, memória, ingest, store) + Bash fino orquestrando + Node restante (LLM/skill-routing) até consolidar em `src/`.

### Quem escreve (modelo B)

| Ator | Auth | O que grava |
| --- | --- | --- |
| Dev / CLI local | `service_role` no local; no cloud → JWT + RLS member | runs `local`/`agent`, findings, decisions de `/finalizar` |
| CI (GitHub Actions) | secret `SUPABASE_SERVICE_ROLE_KEY` | runs `ci`, findings, ingest de PR |
| Dashboard futuro | JWT authenticated | SELECT por membership |

**VPS HostDime no meio**: fora de escopo da v1 (só se política de rede impedir CI/agent → Supabase direto).

---

## Schema (já migrado local)

| Tabela | Papel |
| --- | --- |
| `projects` | Um repositório / sistema |
| `profiles` + `project_members` | Multi-usuário + roles `owner`/`member`/`viewer` |
| `review_runs` | Uma execução (source: local \| ci \| pre_commit \| agent) |
| `findings` | Achados (podem ter body/De/Para sensíveis) |
| `decisions` | Veredito hard: aceito \| rejeitado \| nao-aplicavel |
| `exclusions` | Política exportável sem snippet |
| `conventions` | Bullets por scope (ex-`convencoes.md`) |

IDs estáveis de achado: `finding_key` (alinha a `stable_finding_id` / tema, não path:linha).

RLS: `authenticated` só em projetos de que é membro; `service_role` bypassa (CI e tooling). Detalhe: migration `20260810120000_review_store.sql`.

---

## Unificação hard (contrato)

O que conta como review **oficial**:

1. Existe um `review_runs` (`status` completed/failed).
2. Findings daquele run em `findings`.
3. Decisões humanas (ou ingest PR) em `decisions`.

O agent **pode** analisar livremente no chat.  
`/finalizar` (e o fluxo CI pós-review) **devem** chamar o store. Markdown em `resultados/` vira artefato exportável, não a fonte.

Soft (transição): dual-write arquivo + store. Hard (meta): store obrigatório se `SUPABASE_URL` configurada; sem URL, só arquivo (modo offline).

---

## Fases

### Fase U0 — Fundação local (atual)

| Item | Status |
| --- | --- |
| `supabase init` + `config.toml` | feito |
| Migration review store + RLS | feito |
| Seed demo (sem código de cliente) | feito |
| Docker `npm run supabase:start` | feito |
| Plano neste arquivo | **agora** |
| `.env.example` + doc local | **agora** |
| Cliente thin REST + smoke (**Node** `src/store`, `bin/`) | feito |

**Aceite U0:** Studio em `:54323`; seed visível; `npm run review:store-smoke` grava run/finding/decision.

### Fase U1 — Domínio no store

> **S4 feito** ([PLANO-MODULAR-SLICES](PLANO-MODULAR-SLICES.md)): `port` + adapter + `dualWriteDecisions`.

| Item | Status |
| --- | --- |
| Mapear decisões jsonl → `decisions` (verdict enum) | **feito** (skip `adiado`) |
| Run CI no dual-write ingest (`source: ci`, `pr_number`) | **feito** |
| `upsertDecision` / `listMemory` na port | **feito** |
| Dual-write soft ingest + `npm run review:dual-write` | **feito** |
| Unit tests sem rede (mock port) | **feito** |
| Hard-fail se `SUPABASE_URL` e store down | **opcional** (`REVIEW_STORE_REQUIRED=1`, U4) |

### Fase U2 — Drivers local + CI

| Item | Status |
| --- | --- |
| Env: `SUPABASE_URL`, keys, `REVIEW_PROJECT_SLUG` | **feito** |
| `publishRun` + `bin/review-store-publish.ts` | **feito** |
| CI template: pull memory + publish steps | **feito** (`github-avaliar-pr.yml`) |
| Fallbacks offline (só arquivo se store down) | **feito** (soft default) |
| `/finalizar` chama dual-write | **feito** (soft) |

### Fase U3 — Memória e exclusões

| Item | Status |
| --- | --- |
| `listExclusions` / `listConventions` / upsert na port | **feito** |
| LLM merge store + arquivos | **feito** |
| `review:memory-pull` / `review:memory-push` | **feito** |
| Export slim yaml (sem snippets) | **feito** |
| Dashboard multi-projeto | Studio (v1) — app interno fora deste monorepo |

### Fase U4 — Cloud HostDime

| Item | Status |
| --- | --- |
| Guia projeto cloud + secrets CI | **feito** ([docs/supabase-cloud.md](supabase-cloud.md)) |
| Auth multi-user + RLS (schema) | **feito** (migration); membership operacional no projeto cloud |
| `REVIEW_STORE_REQUIRED` hard por repo | **feito** |
| Projeto cloud físico + SSO org | **ops HostDime** (fora do git de dados) |

---

## Próximo passo imediato

1. Local: `npm run supabase:start` + `review:store-smoke`.
2. CI alvo: secrets `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` + var `REVIEW_PROJECT_SLUG`.
3. Cloud: seguir [supabase-cloud.md](supabase-cloud.md).

## O que NÃO vai no git do hostdime-ia

- Dumps, `.env` real, service keys de **produção**
- Findings com trechos de repositórios de clientes
- Volumes Docker locais (`.branches`, etc. — ver `supabase/.gitignore`)

**Pode** ir no git: migrations, seed sintético, `config.toml`, client, plano, `.env.example`.

---

## Comandos (local)

```bash
npm run supabase:start    # Docker stack
npm run supabase:status   # URLs + keys demo
npm run supabase:reset    # migrations + seed
npm run supabase:stop

# URL/keys no ambiente (ver docs/supabase-local.md)
npm run review:store-smoke
```

---

## Critérios de pronto do produto

- [x] Mesmo formato de run em local e CI (`publishRun` / dual-write)
- [x] Decisões de dev e PR no mesmo `decisions` por `project_id`
- [x] Query “findings rejeitados do projeto” via PostgREST/Studio (schema)
- [x] Nenhum artefato sensível no histórico git do monorepo (policy)
- [x] Offline: review continua só com arquivos se store offline (soft)
