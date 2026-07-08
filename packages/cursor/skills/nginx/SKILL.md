---
name: nginx
description: >-
  Orienta nginx: reverse proxy, TLS, headers de segurança e performance. Use ao configurar nginx na frente de uma app, servir estáticos, terminar TLS ou revisar um server block.
---

# nginx

## Quando usar

- Reverse proxy na frente de uma app (Node, PHP-FPM, Python)
- Servir arquivos estáticos com cache eficiente
- Terminar TLS e aplicar headers de segurança

## Princípios

- nginx cuida de TLS, estáticos e roteamento; app cuida da lógica
- Config declarativa e versionada; recarregar sem derrubar conexões
- HTTPS por padrão, redirect de HTTP e headers de segurança
- Timeouts e limites explícitos para resiliência

## Referências

| Tópico | Arquivo |
| --- | --- |
| Reverse proxy | [references/reverse-proxy.md](references/reverse-proxy.md) |
| TLS e headers | [references/tls-and-headers.md](references/tls-and-headers.md) |
| Performance | [references/performance.md](references/performance.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com `nginx -t` antes de `systemctl reload nginx`
4. Documentar exceções apenas quando o trade-off não for óbvio

## Anti-padrões comuns

- `proxy_pass` sem repassar `Host`/`X-Forwarded-*` (app perde IP/protocolo real)
- Servir HTTP sem redirect para HTTPS
- TLS com protocolo/cipher fraco ou certificado sem renovação automática
- `nginx -s reload` sem `nginx -t` (derruba tudo com config inválida)

## Relacionado

- `linux-server` para systemd, permissões e logs do nginx
- `deployment-strategies` para reload sem downtime e upstreams
- `env-secrets` para certificados e credenciais
- `security` para headers e superfície de ataque
