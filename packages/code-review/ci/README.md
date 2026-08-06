# CI — review estático e /avaliar automático no GitHub

## GitHub — `/avaliar` automático no PR (Fase 2)

Comentários **por arquivo** no pull request — **estático + LLM** no formato `/avaliar` (De/Para, GitHub + PT).

| Artefato | Onde |
| --- | --- |
| Orquestrador | `packages/code-review/tools/review-github-pr.sh` |
| LLM | `packages/code-review/tools/review-llm.mjs` |
| Prompt | `packages/code-review/templates/avaliar-llm-system.md` |
| Export exclusões | `packages/code-review/tools/review-export-exclusions.sh` |
| Template workflow | `packages/code-review/ci/github-avaliar-pr.yml` |
| Exemplo ativo | `hostdime-hub` → `.github/workflows/avaliar-pr.yml` |

### Incluir no projeto

Copie `github-avaliar-pr.yml` para `.github/workflows/avaliar-pr.yml`.

**Versionar no repo alvo:**

| Arquivo | Motivo |
| --- | --- |
| `.cursor/review/convencoes.md` | Convenções por escopo (LLM + referência) |
| `.cursor/review/exclusions.yaml` | Achados rejeitados / não aplicáveis (CI não repete) |
| `.cursor/review/.memoria-version` | Schema v2 (`2`) |

Manter **gitignored**: `context.yaml`, `decisions.jsonl`, `reports/` (CI), `resultados/`.

**Promover memória local → CI:**

```bash
# convenções
/memoria promover   # no Cursor → commit convencoes.md

# exclusões
bash review-export-exclusions.sh /caminho/do/projeto
git add .cursor/review/exclusions.yaml && git commit
```

### Secrets e variables (GitHub)

| Nome | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `REVIEW_LLM_API_KEY` | Secret | Sim (Fase 2) | API key OpenAI ou Anthropic |
| `REVIEW_LLM_MODEL` | Variable | Não | Default `gpt-4o-mini` (OpenAI) |
| `REVIEW_LLM_PROVIDER` | Variable | Não | `openai` (default) ou `anthropic` |

Sem `REVIEW_LLM_API_KEY`: roda só **Fase 1** (estático).

### Comportamento

- Dispara em `pull_request` (`opened`, `synchronize`, `reopened`)
- **Incremental:** blob SHA por arquivo (estado em comentário oculto)
- Por arquivo:
  1. `review-check.sh` (Semgrep, ESLint, PHPStan, tsc)
  2. `review-llm.mjs` → relatório `/avaliar` (convencoes + exclusions + diff)
  3. Comentário no PR (cria ou atualiza)
  4. Comentários **inline** nos achados com `#### arquivo:L`
  5. Cópia em `.cursor/review/reports/` → artifact no workflow
- Job **falha** se veredito ≠ OK
- `/finalizar` no Cursor continua para decisões do dev

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
