# GitLab CI

## Estrutura

- Arquivo `.gitlab-ci.yml` na raiz
- `stages:` define a ordem (`stage:` de cada job)
- Jobs no mesmo stage rodam em paralelo; stages em série
- `script:` com os comandos; `image:` define o container do job

## Boas práticas

- `image:` com tag fixa (não `latest`) para reprodutibilidade
- `rules:` (moderno) em vez de `only/except` para controlar quando o job roda
- `cache:` por chave do lockfile; `artifacts:` para passar saída entre stages
- `default:` para config comum (image, before_script, retry)

## Regras e gatilhos

- `rules:` com `if:` (branch, MR, tag) e `changes:` (paths)
- `workflow:` no topo controla quando o pipeline inteiro roda
- Merge request pipelines para validar antes do merge

## Secrets e variáveis

- Variáveis de CI/CD nas settings (Project/Group), mascaradas e protegidas
- Variável protegida só em branch/tag protegida
- OIDC/ID tokens para autenticar no cloud sem chave estática
- Nunca ecoar segredo em log

## Deploy e ambientes

- `environment:` nomeia o ambiente (dev/staging/prod)
- `when: manual` para gate de deploy manual
- Aprovação/proteção de ambiente para produção

## Exemplo mental (lint→test→build)

```yaml
stages: [test, build]
default:
  image: node:20
test:
  stage: test
  cache:
    key: { files: [package-lock.json] }
    paths: [node_modules/]
  script:
    - npm ci
    - npm run lint && npm test
```

## Runners

- Shared vs próprios; tags para direcionar job ao runner certo
- Runner próprio para acesso a rede/infra interna

## Evitar

- `image: ...:latest` (build não reproduzível)
- `only/except` novo código (preferir `rules`)
- Variável sensível não mascarada/protegida
