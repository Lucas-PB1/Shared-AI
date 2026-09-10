---
name: docker-compose
description: >-
  Orienta Docker Compose: múltiplos serviços locais, redes, volumes, healthchecks e env. Use ao subir ambiente de desenvolvimento com vários containers, orquestrar dependências (app + banco + cache) ou revisar um compose file.
---

# Docker Compose

## Quando usar

- Ambiente local com múltiplos serviços (app, banco, cache, fila)
- Declarar dependências e ordem de subida entre containers
- Padronizar o "sobe tudo com um comando" do time

## Princípios

- Compose é para dev/CI local; produção usa orquestrador (Swarm/Kubernetes)
- Cada serviço declara imagem/build, portas, env e volumes explicitamente
- Depender de healthcheck, não de `sleep`, para ordem de inicialização
- Config por env/`.env`, nunca segredo commitado no YAML

## Referências

| Tópico | Arquivo |
| --- | --- |
| Serviços e redes | [references/services-and-networks.md](references/services-and-networks.md) |
| Volumes e env | [references/volumes-and-env.md](references/volumes-and-env.md) |
| Healthchecks e dependências | [references/healthchecks.md](references/healthchecks.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com `docker compose config` e `docker compose up` limpo
4. Documentar exceções apenas quando o trade-off não for óbvio no arquivo

## Anti-padrões comuns

- `version:` legada e obrigatória (Compose atual dispensa a chave `version`)
- Segredo hardcoded no YAML em vez de `.env`/secret
- `depends_on` simples esperando que o serviço esteja *pronto* (ele só espera *iniciar*)
- Volume anônimo escondendo estado que deveria ser nomeado ou efêmero

## Relacionado

- `docker` para o Dockerfile de cada serviço
- `env-secrets` para `.env` e variáveis por ambiente
