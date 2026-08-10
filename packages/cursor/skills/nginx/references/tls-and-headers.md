# TLS e headers

## HTTPS por padrão

- `listen 443 ssl;` com `ssl_certificate` e `ssl_certificate_key`
- Redirect de HTTP: server na 80 com `return 301 https://$host$request_uri;`
- Certificado via Let's Encrypt/ACME com renovação automática

## Protocolos e ciphers

- `ssl_protocols TLSv1.2 TLSv1.3;` (sem TLS 1.0/1.1)
- Suíte de ciphers moderna; `ssl_prefer_server_ciphers off` no TLS 1.3
- `ssl_session_cache` para reduzir handshakes

## Headers de segurança

- `Strict-Transport-Security "max-age=63072000; includeSubDomains"` (HSTS)
- `X-Content-Type-Options nosniff`
- `X-Frame-Options SAMEORIGIN` (ou CSP `frame-ancestors`)
- `Content-Security-Policy` conforme a app (evita XSS)
- `Referrer-Policy`, `Permissions-Policy` conforme necessidade

## Certificados

- Renovação automática (certbot/acme.sh) + reload do nginx no hook
- Monitorar validade; alertar antes de expirar

## Validação

- `nginx -t` antes de recarregar
- Testar TLS externamente (grade de SSL, verificar cadeia completa)

## Evitar

- HTTP servindo conteúdo sensível sem redirect
- Protocolos/ciphers fracos ou obsoletos habilitados
- HSTS agressivo antes de garantir HTTPS estável (preload é difícil de reverter)
