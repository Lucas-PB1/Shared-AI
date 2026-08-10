# CI — review estático e /avaliar automático no GitHub

## GitHub — `/avaliar` automático no PR (Fase 2)

Comentários **por arquivo** no pull request — **estático + LLM** no formato `/avaliar` (De/Para, GitHub + PT).

| Artefato | Onde |
| --- | --- |
| Orquestrador | `packages/code-review/tools/review-github-pr.sh` |
| LLM | `packages/code-review/tools/review-llm.mjs` |
| Roteamento skills | `packages/code-review/tools/review-skill-routing.mjs` |
| Prompt | `packages/code-review/templates/avaliar-llm-system.md` |
| Export exclusões | `packages/code-review/tools/review-export-exclusions.sh` |
| Ingest pós-merge | `packages/code-review/bin/review-ingest-pr-decisions.ts` (via `tools/review-ingest-pr-decisions.sh`) |
| Template workflow | `packages/code-review/ci/github-avaliar-pr.yml` |
| Template memória | `packages/code-review/ci/github-avaliar-pr-memoria.yml` |
| Exemplo ativo | `hostdime-hub` → `.github/workflows/avaliar-pr.yml` |

### Incluir no projeto

Copie `github-avaliar-pr.yml` para `.github/workflows/avaliar-pr.yml`.

Copie `github-avaliar-pr-memoria.yml` para `.github/workflows/avaliar-pr-memoria.yml` — dispara no **merge** do PR e atualiza `convencoes.md` / `exclusions.yaml` a partir dos threads do `/avaliar`.

**Versionar no repo alvo:**

| Arquivo | Motivo |
| --- | --- |
| `.cursor/review/convencoes.md` | Convenções por escopo (LLM + referência) |
| `.cursor/review/exclusions.yaml` | Achados rejeitados / não aplicáveis (CI não repete) |
| `.cursor/review/decisions-ingest.jsonl` | Histórico acumulado de decisões do ingest pós-merge (CI) |
| `.cursor/review/.memoria-version` | Schema v2 (`2`) |

Manter **gitignored**: `context.yaml`, `decisions.jsonl` (staging local), `reports/` (CI), `resultados/`.

**Promover memória local → CI:**

```bash
# convenções
/memoria promover   # no Cursor → commit convencoes.md

# exclusões
bash review-export-exclusions.sh /caminho/do/projeto
git add .cursor/review/exclusions.yaml && git commit
```

**Aprendizado automático pós-merge (CI):**

1. Dev mergeia PR com comentários `avaliar-inline`
2. Workflow `avaliar-pr-memoria` classifica cada thread (comentários de devs humanos no thread):
   - resposta **rejeitando** o achado (`ignorar`, `false positive`, `não se aplica`, …) → **rejeitado** / **nao-aplicavel** → `exclusions.yaml`
   - resposta **sem objeção** (positiva, neutra ou vazia) → **aceito** → candidate em `decisions-ingest.jsonl`
   - fix no merge (suggestion / De / intra-PR) sem reply → **aceito**
   - merge sem reply e achado **ainda no código** → **rejeitado** → `exclusions.yaml`
3. `aceito` vira bullet em `convencoes.md` após **≥2 ocorrências** do mesmo achado (`finding_id` estável no marker `<!-- avaliar-inline:path:line:fid:… -->`; histórico em `decisions-ingest.jsonl`)
4. Bot abre PR com `decisions-ingest.jsonl` / `convencoes.md` / `exclusions.yaml` se mudarem

Local (dry-run): `PR_NUMBER=49 npm run review:ingest-pr -- --write` no hostdime-ia apontando `--project` pro hub.

### Secrets e variables (GitHub)

| Nome | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| **`CURSOR_API_KEY`** | Secret | **Sim (recomendado)** | [Cursor Dashboard → Integrations / API Keys](https://cursor.com/dashboard) |
| `REVIEW_LLM_API_KEY` | Secret | Fallback | OpenAI/Anthropic direto (se não usar Cursor). Sem este **nem** `CURSOR_API_KEY`, o workflow roda só a **Fase 1 (estático)** |
| `REVIEW_LLM_MODEL` | Variable | Não | Modelo do `agent` (ex. `gpt-5`) ou OpenAI |
| `REVIEW_LLM_PROVIDER` | Variable | Não | `cursor` (default), `openai`, `anthropic` |
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

Por arquivo, `review-skill-routing.mjs` injeta no prompt:

| Origem | O que carrega |
| --- | --- |
| `.cursor/skills/hostdime-*/SKILL.md` | Skills versionadas no repo (sections, chrome, fields, …) |
| `.cursor/rules/*.mdc` | Rules cujo `globs:` casa com o path |
| `packages/code-review/skills/review-inbox/` | Metodologia `/avaliar` |
| Stack (tsx/ts) | Hints embutidos ou `~/.cursor/skills/` se existir localmente |

Mapa de path → skill espelha `.cursor/rules/hostdime-skills-routing.mdc` (ex.: `*Fields.tsx` → `hostdime-module-fields`, `modules/Section*` → `hostdime-sections`, `*.css` / `constants/layout.ts` → `hostdime-styling`).

Sem `CURSOR_API_KEY` nem `REVIEW_LLM_API_KEY`: roda só **Fase 1** (estático).

### Comportamento

- Dispara em `pull_request` (`opened`, `synchronize`, `reopened`)
- **Incremental:** blob SHA por arquivo (estado em comentário oculto)
- Por arquivo:
  1. `review-check.sh` (Semgrep, ESLint, PHPStan, tsc)
  2. `review-llm.mjs` → relatório `/avaliar` (skills/rules por path + convencoes + exclusions + diff)
  3. Comentário no PR (cria ou atualiza)
  4. Comentários **inline** nos achados com `#### arquivo:L`
  5. Cópia em `.cursor/review/reports/` → artifact no workflow
- Job **não bloqueia merge** por default (`REVIEW_AVALIAR_SOFT=true`) — comenta achados para o dev
- Job **falha** só se `REVIEW_AVALIAR_SOFT=false` (gate hard, opcional)
- `/finalizar` no Cursor continua para decisões do dev

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
REVIEW_LLM_API_KEY=sk-... node packages/code-review/tools/review-llm.mjs \
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
