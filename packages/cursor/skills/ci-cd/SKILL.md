---
name: ci-cd
description: >-
  Orienta pipelines de CI/CD: estágios lint→test→build→deploy, cache, artefatos, secrets e gates de qualidade. Use ao criar ou revisar pipeline, automatizar testes/deploy, ou quando o usuário mencionar GitHub Actions, GitLab CI, workflow ou build automático.
---

# CI/CD

## Quando usar

- Automatizar verificação (lint/test) a cada push ou PR
- Montar build reproduzível e publicar artefato/imagem
- Automatizar deploy com gates e possibilidade de rollback

## Princípios

- Pipeline é código: versionado, revisável, reproduzível
- Estágios claros: `lint → test → build → deploy`, falhando cedo
- Rápido e determinístico: cache de deps, jobs paralelos, artefatos entre estágios
- Segredo só via secret store do CI; nunca em log ou no YAML

## Referências

| Tópico | Arquivo |
| --- | --- |
| Princípios de pipeline | [references/pipeline-principles.md](references/pipeline-principles.md) |
| Secrets e artefatos | [references/secrets-and-artifacts.md](references/secrets-and-artifacts.md) |
| GitHub Actions | [references/github-actions.md](references/github-actions.md) |
| GitLab CI | [references/gitlab-ci.md](references/gitlab-ci.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar a plataforma (GitHub Actions / GitLab CI) e a referência
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar o pipeline em um branch/PR antes de mexer no fluxo principal
4. Documentar exceções apenas quando o trade-off não for óbvio no arquivo

## Anti-padrões comuns

- Segredo hardcoded no YAML ou impresso em log
- Pipeline lento sem cache, reinstalando tudo em cada job
- Deploy sem gate (test verde) nem caminho de rollback
- `latest`/sem pin nas actions/imagens do runner (build não reproduzível)

## Relacionado

- `docker` para build/push de imagem no pipeline
- `env-secrets` para configuração e segredos por ambiente
- `deployment-strategies` para a etapa de deploy (zero-downtime, rollback)
- `testing` para os testes rodados no estágio de verificação
