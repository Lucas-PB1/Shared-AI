# CI — review estático e /avaliar automático no GitHub

## GitHub — `/avaliar` automático no PR (Fase 2)

Comentários **por arquivo** no pull request — **estático + LLM** no formato `/avaliar` (De/Para, GitHub + PT).

| Artefato | Onde |
| --- | --- |
| Orquestrador | `packages/code-review/tools/sh/review-github-pr.sh` |
| LLM | `packages/code-review/bin/review-llm.ts` (`src/llm/`) |
| Roteamento skills | `packages/code-review/src/skill-routing/` |
| Prompt | `packages/code-review/templates/avaliar-llm-system.md` |
| Export exclusões | `packages/code-review/tools/sh/review-export-exclusions.sh` |
| Ingest pós-merge | `packages/code-review/bin/review-ingest-pr-decisions.ts` (via `tools/review-ingest-pr-decisions.sh`) |
| Template workflow | `packages/code-review/ci/github-avaliar-pr.yml` |
| Template memória | `packages/code-review/ci/github-avaliar-pr-memoria.yml` |
| Exemplo ativo | `hostdime-hub` → `.github/workflows/avaliar-pr.yml` |

### Incluir no projeto

Copie `github-avaliar-pr.yml` para `.github/workflows/avaliar-pr.yml`.

Copie `github-avaliar-pr-memoria.yml` — no **merge** ingere threads de review **direto no store** (sem PR de yaml no repo).

**Memória = store (obrigatório):**  
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `REVIEW_PROJECT_SLUG` — pull/ingest no CI. Jobs **falham** sem secrets. Sem fallback offline. **Publish de findings não roda no open PR** — só ingest pós-merge.

Cache efêmero: `HOSTDIME_REVIEW_WORKDIR` (default no template: `${{ runner.temp }}/hostdime-review`); artifacts de `reports/`.

**Aprendizado automático pós-merge (CI):**

1. Dev mergeia PR com threads de review
2. Workflow `avaliar-pr-memoria` classifica cada thread e **grava no store** (decisions + exclusions + conventions):
   - `/avaliar` (root com marker `avaliar-inline`)
   - **review humano top-level** (comentário de dev sem marker; reply / Resolve decide aceito vs rejeitado)
   - ao salvar: `finding_id` = slug por **palavras‑chave** do summary (`ingestFindingKey`); fid do marker só rastreio
   - `aceito` → reconcile: slug match/near → **LLM** confirma lógica (`REVIEW_CONVENTION_LLM=0` = heurística só por key ≥2)
3. Memória só no store (sem pasta de review no cliente)

O job de ingest precisa de `CURSOR_API_KEY` ou `REVIEW_LLM_API_KEY` para a promoção (senão cai na heurística).

Local (dry-run): `PR_NUMBER=49 npm run review:ingest-pr -- --write` no hostdime-ia apontando `--project` pro hub.

### Secrets e variables (GitHub)

| Nome | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| **`CURSOR_API_KEY`** | Secret | **Sim (recomendado)** | [Cursor Dashboard → Integrations / API Keys](https://cursor.com/dashboard) |
| `REVIEW_LLM_API_KEY` | Secret | Fallback | OpenAI/Anthropic direto (se não usar Cursor). Sem este **nem** `CURSOR_API_KEY`, o workflow roda só a **Fase 1 (estático)** |
| `REVIEW_LLM_MODEL` | Variable | Não | Modelo do `agent` (ex. `gpt-5`) ou OpenAI |
| `REVIEW_LLM_PROVIDER` | Variable | Não | `cursor` (default), `openai`, `anthropic` |
| `REVIEW_CONVENTION_LLM` | Variable | Não | `0` desliga LLM na promoção de convenções (só heurística) |
| `SUPABASE_URL` | Secret | **Sim** | Store review |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | **Sim** | CI publish/pull |
| `REVIEW_PROJECT_SLUG` | Variable | Não | slug em `projects` (ex. tema HubSpot: `hostdime-hub`; default: nome do repo) |

### Store (U2–U4)

| Artefato | Papel |
| --- | --- |
| `review-store-publish` | run CI + findings dos reports |
| `review-memory-pull` | carrega exclusions/conventions do store (opcional disk cache) |
| `review-memory-push` | exclusions.yaml → store |
| Guia cloud | [docs/okf/supabase-cloud.md](../../../docs/okf/supabase-cloud.md) |
| `REVIEW_SKILL_STACK` | Variable | Não | `false` desliga hints react/typescript no CI |
| `REVIEW_SKILL_MAX_CHARS` | Variable | Não | Limite de chars de skills/rules no prompt (default `18000`) |

```bash
gh secret set CURSOR_API_KEY --repo HostDimeBR/hostdime-hub
# colar a key gerada em https://cursor.com/dashboard

# Opcional — provider HTTP direto (sem Cursor agent)
gh secret set REVIEW_LLM_API_KEY --repo HostDimeBR/hostdime-hub
```

**Resumo:** LLM no PR precisa de `CURSOR_API_KEY` **ou** `REVIEW_LLM_API_KEY`. Ambos ausentes = somente Semgrep/ESLint/PHPStan/`tsc` (sem custo de modelo).

### Roteamento de skills (CI)

Por arquivo, `src/skill-routing` injeta no prompt:

| Origem | O que carrega |
| --- | --- |
| `.cursor/skills/hostdime-*/SKILL.md` | Skills versionadas no repo (sections, chrome, fields, …) |
| `.cursor/rules/*.mdc` | Rules cujo `globs:` casa com o path |
| `packages/code-review/skills/review-inbox/` | Metodologia `/avaliar` |
| Stack (tsx/ts) | Hints embutidos ou `~/.cursor/skills/` se existir localmente |

Mapa de path → skill espelha `.cursor/rules/hostdime-skills-routing.mdc` (ex.: `*Fields.tsx` → `hostdime-module-fields`, `modules/Section*` → `hostdime-sections`, `*.css` / `constants/layout.ts` → `hostdime-styling`).

Sem `CURSOR_API_KEY` nem `REVIEW_LLM_API_KEY`: roda só **Fase 1** (estático).

### Comportamento

- No **hostdime-hub**: dispara via `workflow_run` **após** o workflow **Review** (quality gate) passar; o template genérico ainda pode usar `pull_request` direto
- **Incremental (Avaliar):** blob SHA por arquivo (estado em comentário oculto) — não reavalia arquivo sem mudança no head
- Por arquivo:
  1. `review-check.sh` (Semgrep, ESLint, PHPStan, tsc)
  2. `review-llm.ts` → relatório `/avaliar` (skills/rules por path + convencoes + exclusions + diff)
  3. Comentário no PR (cria ou atualiza)
  4. Comentários **inline** nos achados com `#### arquivo:L` (De/Para).
     **Não apaga** threads no re-run quando o achado some (histórico + reply/Resolve).
     Opt-in de purge: `REVIEW_AVALIAR_INLINE_PURGE=1`.
  5. Cópia em workdir tmp (`HOSTDIME_REVIEW_WORKDIR/reports/`) → artifact no workflow
- Job **não bloqueia merge** por default (`REVIEW_AVALIAR_SOFT=true`) — comenta achados para o dev
- Job **falha** só se `REVIEW_AVALIAR_SOFT=false` (gate hard, opcional)
- `/finalizar` no Cursor confirma vereditos e devolve texto no chat (**sem** gravar no store)

### Cache (CI)

O template `github-avaliar-pr.yml` restaura caches entre runs para reduzir cold start:

| Cache | Path | Chave |
| --- | --- | --- |
| npm (projeto) | via `setup-node` | `package-lock.json` |
| hostdime-ia | `hostdime-ia/node_modules`, `hostdime-ia/vendor` | hash de `package.json` + `composer.json` |
| Cursor CLI | `~/.cursor` | `cursor-cli-{os}-v1` |
| pip (semgrep) | `~/.cache/pip` | `pip-semgrep-{os}-v1` |

No cache hit de hostdime-ia, `npm install` / `composer install` são pulados. O sparse checkout do `hostdime-ia` sempre roda (código de review + manifestos).

Logs do LLM incluem timestamp UTC (`… LLM (HH:MM:SS UTC)` / `✓ LLM`) em `review-github-pr.sh`.

### Modos (`REVIEW_AVALIAR_MODE`)

| Valor | Efeito |
| --- | --- |
| `both` | Estático + LLM (default) |
| `static` | Só Fase 1 |
| `llm` | Só LLM (ainda roda static internamente para contexto) |

No dispatch manual: input `mode`.

### Local

```bash
cd /caminho/do/projeto
export GH_TOKEN=$(gh auth token)
export PR_NUMBER=42
export REVIEW_DIFF_BASE=origin/main
export HEAD_SHA=$(git rev-parse HEAD)
export REVIEW_LLM_API_KEY=sk-...
HOSTDIME_IA_ROOT=/caminho/hostdime-ia npm run review:github-pr
```

Testar só LLM de um arquivo:

```bash
REVIEW_LLM_API_KEY=sk-... bash packages/code-review/tools/sh/review-llm.sh \
  --project /caminho/projeto --file src/Foo.tsx
```

---

## GitLab — review estático (merge requests)

Mesmas ferramentas do `review-check.sh`: Semgrep, PHPStan, ESLint, `tsc`.

### Incluir no projeto

```yaml
include:
  - project: 'HostDimeBR/hostdime-ia'
    file: '/packages/code-review/ci/gitlab-review.yml'
    ref: main
```

### Local

```bash
HOSTDIME_IA_ROOT=/caminho/hostdime-ia npm run review:ci -- main
```
