---
name: docker
description: >-
  Orienta Docker: Dockerfile, imagens enxutas, multi-stage, cache de layers e hardening. Use ao containerizar apps, escrever ou revisar Dockerfile, ou quando o usuário pedir imagem menor, build reproduzível ou container seguro.
---

# Docker

## Quando usar

- Containerizar uma aplicação (escrever `Dockerfile`)
- Reduzir tamanho ou tempo de build de imagem
- Revisar imagem quanto a segurança e reprodutibilidade

## Princípios

- Uma imagem = um processo/responsável; efêmera e reconstruível
- Pin de versões (base image e deps) para build reproduzível
- Ordenar camadas do menos ao mais volátil para aproveitar cache
- Rodar como usuário não-root; imagem mínima é menor superfície de ataque

## Referências

| Tópico | Arquivo |
| --- | --- |
| Fundamentos do Dockerfile | [references/dockerfile-basics.md](references/dockerfile-basics.md) |
| Imagem enxuta e cache | [references/image-optimization.md](references/image-optimization.md) |
| Hardening de segurança | [references/security-hardening.md](references/security-hardening.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com `docker build` + `docker run` (e um scan de imagem quando houver)
4. Documentar exceções apenas quando o trade-off não for óbvio no arquivo

## Anti-padrões comuns

- `FROM <base>:latest` sem pin — build não reproduzível
- Rodar como root sem necessidade
- Copiar todo o contexto (`COPY . .`) sem `.dockerignore`
- Instalar ferramentas de build na imagem final em vez de usar multi-stage

## Relacionado

- `docker-compose` para orquestrar múltiplos serviços localmente
- `ci-cd` para build/push da imagem no pipeline
- `env-secrets` para configuração e segredos em runtime
