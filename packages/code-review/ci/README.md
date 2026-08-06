# CI — review estático e /avaliar automático no GitHub

## GitHub — `/avaliar` automático no PR

Comentários **por arquivo** no pull request (análise estática = paridade com `review-check.sh`).

| Artefato | Onde |
| --- | --- |
| Script | `packages/code-review/tools/review-github-pr.sh` |
| Template workflow | `packages/code-review/ci/github-avaliar-pr.yml` |
| Exemplo ativo | `hostdime-hub` → `.github/workflows/avaliar-pr.yml` |

### Incluir no projeto

Copie `github-avaliar-pr.yml` para `.github/workflows/avaliar-pr.yml` ou use o do `hostdime-hub` como referência.

**Versionar no repo alvo:**

| Arquivo | Motivo |
| --- | --- |
| `.cursor/review/convencoes.md` | Convenções aplicáveis no CI (referência por escopo) |
| `.cursor/review/.memoria-version` | Schema v2 (`2`) |

Manter **gitignored**: `context.yaml`, `decisions.jsonl`, `reports/`, `resultados/` (memória local / staging).

Promover convenções: `/memoria promover` no Cursor → commit `convencoes.md`.

### Comportamento

- Dispara em `pull_request` (`opened`, `synchronize`, `reopened`)
- Lista arquivos alterados (`review-diff.sh`)
- **Incremental:** só re-revisa arquivo cujo blob SHA mudou desde a última execução (estado em comentário oculto no PR)
- Por arquivo: Semgrep, ESLint, PHPStan, tsc → comentário no PR (atualiza se já existir)
- Comentário-resumo no topo com contagem
- Job **falha** se houver achados estáticos (exit 1)
- Deep dive De/Para: continua manual com `/avaliar` no Cursor

### Variáveis

| Variável | Padrão |
| --- | --- |
| `HOSTDIME_IA_REPO` | `https://github.com/HostDimeBR/hostdime-ia.git` |
| `HOSTDIME_IA_REF` | `main` |

### Local (antes de abrir PR)

```bash
cd /caminho/do/projeto
export GH_TOKEN=$(gh auth token)
export PR_NUMBER=42
export REVIEW_DIFF_BASE=main
export HEAD_SHA=$(git rev-parse HEAD)
HOSTDIME_IA_ROOT=/caminho/hostdime-ia npm run review:github-pr
```

Ou na raiz do hostdime-ia:

```bash
cd /caminho/do/projeto
PR_NUMBER=42 REVIEW_DIFF_BASE=origin/main HEAD_SHA=HEAD \
  HOSTDIME_IA_ROOT=/caminho/hostdime-ia \
  bash /caminho/hostdime-ia/packages/code-review/tools/review-github-pr.sh
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

Ajuste `project` e `ref` conforme o clone da sua organização.

### Variáveis opcionais

| Variável | Padrão | Uso |
| --- | --- | --- |
| `HOSTDIME_IA_REPO` | URL do clone | Só usado se `HOSTDIME_IA_ROOT` não estiver definido |
| `HOSTDIME_IA_REF` | `main` | Branch/tag do hostdime-ia |
| `HOSTDIME_IA_ROOT` | _(clone em `/tmp/hostdime-ia`)_ | Caminho com `node_modules` e `vendor` já instalados (cache) |

### Local (antes de abrir MR)

```bash
cd /caminho/do/seu/projeto
HOSTDIME_IA_ROOT=/caminho/hostdime-ia \
  bash /caminho/hostdime-ia/packages/code-review/tools/review-ci.sh main
```

Ou na raiz do hostdime-ia:

```bash
npm run review:ci -- main
```

### Comportamento

- Roda em **merge requests** (`merge_request_event`)
- Lista arquivos alterados (`review-diff.sh`) — usa `CI_MERGE_REQUEST_DIFF_BASE_SHA` no GitLab
- Executa `check-inbox.sh` por arquivo com `REVIEW_CHECK_CI=1` (falha o job se houver achados)
- Não substitui o `/avaliar` com LLM — só análise estática, igual ao passo 1 do command
