# Testes

```bash
npm run test
```

Entry point: `tests/run-all.sh`.

1. Se `bats` estiver no `PATH` (ou em `vendor/bats/bin/bats`), roda `bats tests/`.
2. Senão, roda o **runner embutido** `tests/run-embedded.sh` (sem dependência de bats).

Ambiente **isolado** — não altera `~/.cursor` real (`CURSOR_USER_DIR` temporário).

O CI (**GitHub Actions**) usa o mesmo `npm test` (runner embutido se bats não estiver instalado na imagem).

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `run-all.sh` | Dispatcher bats vs embedded |
| `run-embedded.sh` | Suite completa embutida (sempre o caminho sem bats) |
| `helpers.bash` | Setup/teardown e asserts compartilhados (bats + libs) |
| `*.bats` | Specs bats (subset; preferir manter paridade com embedded) |

### Specs bats (`tests/*.bats`)

| Arquivo | Cobertura |
| --- | --- |
| `link.bats` | symlinks, preservação de arquivo real, scrub gitignore |
| `bootstrap.bats` | perfil, registry, perfil inválido |
| `detach.bats` | remove symlinks, preserva perfil, registry |
| `merge-hooks.bats` | merge idempotente de hooks.json |
| `finalizar.bats` | empacota review (inbox / arquivo de repo) |
| `hubspot-mcp.bats` | install/status HubSpot MCP |
| `profiles.bats` | detect + bootstrap next/python/zend |
| `onboard.bats` | onboard não interativo |
| `health.bats` | health multi-projeto |
| `review-smoke.bats` | review-diff, review-ci, check-inbox, export, ingest (sem gh) |

### Runner embutido (além do subset bats)

Cobertura extra em `run-embedded.sh` (e nos `*.bats` equivalentes quando existirem):

| Tema | Exemplos de asserts |
| --- | --- |
| boot-sync | on/off/unset, prompt skip |
| historico | validate, scope match, merge hooks, templates, pending catch-up |
| cursor-cli | merge `cli-config`, dry-run install |
| agent | dry-run com args de projeto |
| sync-inbox | scan e summary/cards |
| memoria | migrar v2 / restore (sem legacy) |
| review smoke | diff/ci vazio e com arquivo, check-inbox, export exclusions, ingest, py_compile |

### Fixtures

| Caminho | Uso |
| --- | --- |
| `tests/fixtures/review/sample-ok.mjs` | JS limpo para check-inbox / review-ci |
| `tests/fixtures/review/context.yaml` | memory v2 sintético para export de exclusions |

### Lint local (paridade CI)

```bash
npm run lint:shell    # ShellCheck (skip suave se não instalado)
npm run lint:python   # py_compile dos tools Python
```

## Requisitos

- Bash, git, Python 3, PyYAML (export exclusions: `pip install pyyaml` se faltar)
- Node ≥ 20 (scripts npm do clone; ESLint no smoke JS)
- Opcional: [bats](https://github.com/bats-core/bats-core), [shellcheck](https://www.shellcheck.net/)

```bash
# Debian/Ubuntu
sudo apt install bats shellcheck
npm run test
npm run lint:shell
npm run lint:python
```

## Higiene

- Não commitar `node_modules/`, `vendor/`, `__pycache__/`
- Locks da raiz (`package-lock.json`, `composer.lock`) **são versionados**
- Smokes de review **não** chamam API LLM nem `gh` (ingest via fixture Python)