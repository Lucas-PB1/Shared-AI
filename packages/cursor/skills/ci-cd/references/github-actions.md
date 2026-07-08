# GitHub Actions

## Estrutura

- Workflows em `.github/workflows/*.yml`
- `on:` define gatilhos (`push`, `pull_request`, `workflow_dispatch`, `schedule`)
- `jobs:` rodam em paralelo por padrão; `needs:` cria dependência/ordem
- `steps:` dentro do job: `uses:` (action) ou `run:` (comando)

## Boas práticas

- **Pin de actions por sha** (não só tag) para segurança e reprodutibilidade
- `permissions:` mínimo no topo (default restrito); elevar só onde precisa
- `concurrency:` para cancelar runs antigas do mesmo branch/PR
- Cache de deps (`actions/cache` ou cache nativo do setup-*) por lockfile

## Matrix

- `strategy.matrix` para testar várias versões/OS em paralelo
- `fail-fast` conforme necessidade

## Secrets e OIDC

- `secrets.NOME` do repositório/ambiente; nunca ecoar em log
- **Environments** com required reviewers para gate de deploy
- OIDC (`permissions: id-token: write`) para assumir role no cloud sem chave estática

## Artefatos e cache

- `actions/upload-artifact` / `download-artifact` entre jobs
- Cache é para acelerar; artefato é para reusar saída de build

## Exemplo mental (lint→test→build)

```yaml
on: [push, pull_request]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-node@<sha>
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint && npm test
```

## Evitar

- Action de terceiro sem pin (supply chain)
- `permissions: write-all` por padrão
- Segredo em `run: echo ${{ secrets.X }}`
