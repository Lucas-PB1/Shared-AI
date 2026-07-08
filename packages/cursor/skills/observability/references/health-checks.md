# Health checks

## Liveness vs readiness

- **Liveness**: o processo está vivo? Se não, orquestrador reinicia
- **Readiness**: pronto para receber tráfego? Se não, tira do balanceador
- São diferentes: uma app viva pode não estar pronta (aquecendo, dependência fora)

## Endpoint

- `/health` (ou `/healthz`) leve e rápido
- Readiness checa dependências críticas (banco, cache) com timeout curto
- Liveness só confirma que o processo responde (não checar dependência externa)

## Boas práticas

- Timeout curto para não travar o probe
- Cache curto do resultado se a checagem for cara
- Diferenciar degradado de fora do ar (retornar detalhe quando útil)
- Não expor detalhe sensível de infra no corpo público

## Uso no deploy

- Orquestrador/nginx só manda tráfego quando readiness passa
- Rolling deploy espera o novo container ficar ready antes de matar o antigo
- Compose usa healthcheck para ordenar dependências

## Dependências

- Readiness pode falhar se dependência crítica está fora → tira do LB, não crash-loop
- App deve tolerar dependência temporariamente indisponível (retry/backoff)

## Evitar

- Health check que sempre retorna 200 sem checar nada
- Liveness dependendo de serviço externo (causa restart em cascata)
- Probe pesado rodando com frequência alta
