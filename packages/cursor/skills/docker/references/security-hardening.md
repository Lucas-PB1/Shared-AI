# Hardening de segurança

## Usuário não-root

- Criar usuário dedicado e `USER app` antes do `CMD`
- Ajustar permissões só do necessário (`chown` no diretório da app)
- Root no container = risco maior em caso de escape

## Superfície mínima

- Base slim/distroless; menos binários = menos CVEs
- Não instalar `curl`, `bash`, ferramentas de debug na imagem de produção
- Remover setuid/setgid desnecessários quando aplicável

## Segredos

- Nunca `ENV SENHA=...` nem `COPY .env` na imagem (fica no histórico de layers)
- Injetar em runtime: variável de ambiente, secret do orquestrador, arquivo montado
- Build secrets: `RUN --mount=type=secret` (BuildKit), não `ARG` para segredo

## Deps e versões

- Pin da base image por tag e, idealmente, digest (`@sha256:...`)
- Scan de vulnerabilidade na imagem (ex.: `trivy`, `docker scout`) no CI

## Runtime

- `--read-only` no filesystem quando possível; `tmpfs` para diretórios graváveis
- Dropar capabilities não usadas; não rodar `--privileged` sem motivo
- Healthcheck para o orquestrador saber o estado real

## Evitar

- `latest` sem pin; imagem sem usuário definido
- Segredo em `ARG`/`ENV`/camada; TLS desabilitado sem justificativa
