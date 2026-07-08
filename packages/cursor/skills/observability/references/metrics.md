# Métricas

## Tipos

- **Counter**: só cresce (requisições, erros)
- **Gauge**: sobe e desce (conexões ativas, uso de memória)
- **Histogram**: distribuição (latência, tamanho de payload) → percentis

## O que medir (RED / USE)

- **RED** (serviços): Rate (req/s), Errors (taxa de erro), Duration (latência)
- **USE** (recursos): Utilization, Saturation, Errors
- Foco no que é acionável e alinhado a SLO

## Cardinalidade

- Label é dimensão; cada combinação é uma série temporal
- **Nunca** usar ID de usuário, request_id ou valor livre como label (explode o backend)
- Labels de baixa cardinalidade: rota, método, status, ambiente

## Latência

- Medir percentis (p50/p95/p99), não só média (média esconde cauda)
- Histogram para calcular percentis do lado do backend de métricas

## SLO e alerta

- Definir SLO (ex.: 99,9% das req < 300ms) e alertar por violação/error budget
- Alertar em sintoma para o usuário, não em cada oscilação de recurso
- Evitar alerta ruidoso que ninguém age (fadiga de alerta)

## Exposição

- Endpoint `/metrics` (formato Prometheus) raspado pelo coletor
- Proteger/segregar o endpoint quando exposto

## Evitar

- Só média de latência
- Label de alta cardinalidade
- Métrica que ninguém olha nem alerta
