# Volumes e env

## Tipos de volume

- **Nomeado** (`db-data:/var/lib/postgresql/data`) — estado persistente gerenciado
- **Bind mount** (`./src:/app/src`) — código do host para hot reload em dev
- **Anônimo** — evitar; some do radar e acumula lixo

## Persistência

- Banco/uploads → volume nomeado, declarado em `volumes:` no topo
- Não guardar estado importante só no container (é efêmero)

## Configuração por env

- `environment:` para valores por serviço
- `env_file: .env` para carregar em bloco
- Interpolação `${VAR}` no YAML lê do ambiente / `.env` do diretório
- `.env` no `.gitignore`; versionar apenas `.env.example` com placeholders

## Segredos

- Segredo real nunca no YAML nem commitado
- Local: `.env` ignorado; produção: secret do orquestrador ou secret manager
- `secrets:` do Compose monta como arquivo (melhor que env para dado sensível)

## Dev vs prod

- Override com `docker-compose.override.yml` para ajustes locais
- Bind mount de código só em dev; imagem self-contained em prod

## Evitar

- Commitar `.env` com credencial real
- Bind mount do código em produção
