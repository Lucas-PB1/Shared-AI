# Healthchecks e dependências

## Por que healthcheck

- `depends_on` simples só garante que o container *iniciou*, não que está *pronto*
- Um banco pode estar "up" e ainda não aceitar conexões
- Healthcheck informa o estado real ao Compose e ao orquestrador

## Definir healthcheck

- `test:` comando que retorna 0 quando saudável (ex.: `pg_isready`, `curl -f localhost/health`)
- `interval`, `timeout`, `retries`, `start_period` ajustados ao serviço
- Comando leve — roda repetidamente

## Ordenação por condição

- `depends_on:` com `condition: service_healthy` espera o healthcheck passar
- Assim a `api` só sobe quando `db` está realmente aceitando conexão
- Alternativa/complemento: script de espera no entrypoint (retry com backoff)

## App resiliente

- Ainda assim, a app deve tolerar dependência temporariamente indisponível
- Retry com backoff em vez de assumir que tudo está pronto no boot

## Evitar

- `sleep 10` como "espera" — frágil e lento
- Healthcheck pesado rodando a cada segundo
- Confiar só em `depends_on` sem condição de saúde
