# GitLab CI — review estático (paridade com `/avaliar`)

Mesmas ferramentas do `review-check.sh`: Semgrep, PHPStan, ESLint, `tsc`.

## Incluir no projeto

```yaml
include:
  - project: 'hostdime/hostdime-ia'
    file: '/packages/code-review/ci/gitlab-review.yml'
    ref: main
```

Ajuste `project` e `ref` conforme o clone da sua organização.

## Variáveis opcionais

| Variável | Padrão | Uso |
| --- | --- | --- |
| `HOSTDIME_IA_REPO` | URL do clone | Só usado se `HOSTDIME_IA_ROOT` não estiver definido |
| `HOSTDIME_IA_REF` | `main` | Branch/tag do hostdime-ia |
| `HOSTDIME_IA_ROOT` | _(clone em `/tmp/hostdime-ia`)_ | Caminho com `node_modules` e `vendor` já instalados (cache) |

## Local (antes de abrir MR)

```bash
cd /caminho/do/seu/projeto
HOSTDIME_IA_ROOT=/caminho/hostdime-ia \
  bash /caminho/hostdime-ia/packages/code-review/tools/review-ci.sh main
```

Ou na raiz do hostdime-ia:

```bash
npm run review:ci -- main
```

## Comportamento

- Roda em **merge requests** (`merge_request_event`)
- Lista arquivos alterados (`review-diff.sh`) — usa `CI_MERGE_REQUEST_DIFF_BASE_SHA` no GitLab
- Executa `check-inbox.sh` por arquivo com `REVIEW_CHECK_CI=1` (falha o job se houver achados)
- Não substitui o `/avaliar` com LLM — só análise estática, igual ao passo 1 do command
