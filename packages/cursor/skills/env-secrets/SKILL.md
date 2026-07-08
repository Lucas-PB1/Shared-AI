---
name: env-secrets
description: >-
  Orienta configuração 12-factor e gestão de segredos: variáveis de ambiente, .env, separação por ambiente e nunca commitar segredo. Use ao configurar app por ambiente, lidar com .env/credenciais ou revisar exposição de segredo.
---

# Env & secrets

## Quando usar

- Configurar uma app por ambiente (dev/staging/prod)
- Lidar com `.env`, variáveis de ambiente e credenciais
- Revisar risco de segredo exposto no repo, log ou imagem

## Princípios

- Config no ambiente, não no código (12-factor)
- Um artefato, várias configs: mesmo build roda em qualquer ambiente
- Segredo nunca no git, no log, na imagem ou no bundle do front
- Menor privilégio e escopo por ambiente; rotação e revogação previstas

## Referências

| Tópico | Arquivo |
| --- | --- |
| Config 12-factor | [references/twelve-factor-config.md](references/twelve-factor-config.md) |
| Gestão de segredos | [references/secrets-management.md](references/secrets-management.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar que `.env` está no `.gitignore` e que não há segredo em log/histórico
4. Documentar exceções apenas quando o trade-off não for óbvio

## Anti-padrões comuns

- `.env` com credencial real commitado
- Segredo em variável exposta ao front (`VITE_`, `NEXT_PUBLIC_`)
- Mesma credencial reusada em dev e prod
- Segredo impresso em log de debug ou em mensagem de erro

## Relacionado

- `docker`/`docker-compose` para env em runtime de container
- `ci-cd` para secrets no pipeline (secret store, OIDC)
- `security` para superfície de exposição no client
