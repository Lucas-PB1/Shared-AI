---
name: deployment-strategies
description: >-
  Orienta estratégias de deploy: zero-downtime, blue-green, canary e rollback. Use ao planejar como publicar uma nova versão sem derrubar usuários, reduzir risco de release ou definir plano de reversão.
---

# Deployment strategies

## Quando usar

- Publicar nova versão sem downtime perceptível
- Reduzir raio de impacto de uma release arriscada
- Definir plano de rollback antes de subir

## Princípios

- Deploy é reversível: sempre ter caminho de rollback rápido
- Separar deploy (subir código) de release (ativar para usuário) quando possível
- Mudança de schema compatível para frente e para trás durante a transição
- Validar em produção com tráfego gradual antes de 100%

## Referências

| Tópico | Arquivo |
| --- | --- |
| Zero-downtime | [references/zero-downtime.md](references/zero-downtime.md) |
| Blue-green e canary | [references/blue-green-canary.md](references/blue-green-canary.md) |
| Rollback | [references/rollback.md](references/rollback.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com health check + métricas antes de promover e ter rollback pronto
4. Documentar exceções apenas quando o trade-off não for óbvio

## Anti-padrões comuns

- Deploy que derruba o serviço enquanto sobe a nova versão
- Migração de banco incompatível com a versão antiga durante o rollout
- Sem métricas para decidir promover/reverter o canary
- Rollback que não foi testado (descobre que não funciona na hora do incidente)

## Relacionado

- `ci-cd` para automatizar o deploy e os gates
- `observability` para health checks e métricas que guiam a promoção
- `nginx`/`linux-server` para roteamento e reload sem downtime
- `docker`/`docker-compose` para artefato imutável promovido entre ambientes
