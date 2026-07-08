---
name: observability
description: >-
  Orienta observabilidade: logs estruturados, métricas e health/readiness checks. Use ao instrumentar uma app para produção, padronizar logs, expor métricas ou criar endpoints de saúde.
---

# Observability

## Quando usar

- Instrumentar app para saber o que acontece em produção
- Padronizar logs para busca e correlação
- Expor métricas e health checks para monitoramento e orquestrador

## Princípios

- Logs estruturados (JSON) com campos consistentes, não texto solto
- Três pilares: logs (o quê), métricas (quanto), traces (onde no fluxo)
- Health check reflete o estado real de dependências
- Nunca logar segredo ou PII completa

## Referências

| Tópico | Arquivo |
| --- | --- |
| Logs estruturados | [references/structured-logging.md](references/structured-logging.md) |
| Métricas | [references/metrics.md](references/metrics.md) |
| Health checks | [references/health-checks.md](references/health-checks.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar que o sinal aparece na ferramenta e é acionável (não ruído)
4. Documentar exceções apenas quando o trade-off não for óbvio

## Anti-padrões comuns

- `print`/log de texto livre sem estrutura nem nível
- Logar token, senha ou dado pessoal completo
- Health check que sempre retorna 200 sem checar dependência
- Métrica de alta cardinalidade (ID de usuário como label) estourando o backend

## Relacionado

- `linux-server` para journald e rotação de log
- `ci-cd`/`deployment-strategies` para health check no deploy
- `env-secrets` para não vazar segredo em log
