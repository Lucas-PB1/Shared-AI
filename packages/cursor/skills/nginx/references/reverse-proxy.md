# Reverse proxy

## Bloco básico

- `location / { proxy_pass http://127.0.0.1:3000; }`
- App escuta em loopback; nginx é a única porta pública
- `upstream` nomeado para agrupar múltiplos backends

## Headers repassados

- `proxy_set_header Host $host;`
- `proxy_set_header X-Real-IP $remote_addr;`
- `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
- `proxy_set_header X-Forwarded-Proto $scheme;`
- Sem isso a app vê o IP do nginx e acha que é HTTP

## WebSocket

- `proxy_http_version 1.1;`
- `proxy_set_header Upgrade $http_upgrade;`
- `proxy_set_header Connection "upgrade";`

## Timeouts e limites

- `proxy_connect_timeout`, `proxy_read_timeout` ajustados à app
- `client_max_body_size` para uploads (default é baixo)
- `proxy_buffering` conforme o caso (streaming vs resposta completa)

## PHP-FPM

- `fastcgi_pass unix:/run/php/php-fpm.sock;` + `include fastcgi_params;`
- Cuidado com `SCRIPT_FILENAME` e evitar execução de arquivo arbitrário

## Estáticos e app juntos

- `location /static/ { root /var/www; }` servido direto pelo nginx
- Resto via `proxy_pass` para a app

## Evitar

- Esquecer `X-Forwarded-*` (quebra rate limit, logs e cookies secure da app)
- Expor a porta da app direto ao público
