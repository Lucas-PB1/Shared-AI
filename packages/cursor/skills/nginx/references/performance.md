# Performance

## Estáticos

- Servir arquivos estáticos direto pelo nginx (mais rápido que via app)
- `expires` / `Cache-Control` longo para assets versionados (hash no nome)
- `sendfile on; tcp_nopush on;` para envio eficiente

## Compressão

- `gzip on;` com `gzip_types` para texto/JS/CSS/JSON
- Brotli quando disponível para melhor razão
- Não comprimir binário já comprimido (imagem, vídeo)

## Cache de proxy

- `proxy_cache` para respostas cacheáveis do upstream
- Respeitar cabeçalhos de cache; invalidar quando o conteúdo muda
- `proxy_cache_lock` para evitar thundering herd no miss

## Conexões

- `keepalive` no bloco `upstream` para reuso de conexão com o backend
- `worker_connections` e `worker_processes auto;` conforme CPU
- HTTP/2 (`listen 443 ssl http2;`) para multiplexação

## Limites e proteção

- `limit_req` / `limit_conn` para rate limiting básico
- `client_max_body_size` adequado (nem baixo demais, nem ilimitado)

## Medir

- Log com `$request_time` e `$upstream_response_time` para achar gargalo
- Comparar antes/depois de mudanças

## Evitar

- Passar todo estático pela app
- Cache agressivo em conteúdo dinâmico/autenticado
- Compressão de conteúdo já comprimido
