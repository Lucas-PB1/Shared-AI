# Serviços e redes

## Definição de serviço

- `image:` para imagem pronta ou `build:` para Dockerfile local
- `ports: ["8080:80"]` → `host:container`; expor só o necessário
- `restart: unless-stopped` para serviços que devem se recuperar
- Nomear serviços com o papel (`api`, `db`, `redis`), não com detalhe de impl

## Rede

- Compose cria uma rede default; serviços se resolvem pelo nome do serviço
  - a `api` conecta no banco via host `db`, não `localhost`
- Redes customizadas para isolar grupos de serviços quando necessário
- Só publicar portas no host que realmente precisam ser acessadas de fora

## Comunicação entre serviços

- DNS interno = nome do serviço; porta é a do container (não a publicada)
- Evitar `network_mode: host` (quebra isolamento e portabilidade)

## Escala local

- `docker compose up --scale worker=3` para réplicas de um serviço stateless
- Serviço escalado não pode ter porta fixa publicada (conflito)

## Evitar

- `links:` (deprecated) — a rede default já resolve nomes
- Publicar banco/cache no host sem necessidade (superfície exposta)
