---
name: supabase
description: >-
  Orienta Supabase JS + SSR: clients browser/server, Auth, cookies de sessão e
  RLS. Use com @supabase/supabase-js, @supabase/ssr, login ou Postgres gerenciado.
---

# Supabase

## Quando usar

- Auth (email/senha, sessão, callback OAuth)
- Clients browser vs server (Next App Router)
- Políticas RLS e acesso a Postgres via Supabase

## Princípios

- Service role **nunca** no browser nem em Client Components
- Sessão via cookies SSR (`@supabase/ssr`); refresh no middleware/proxy
- RLS como fonte de verdade de autorização no banco quando o client usa anon/publishable key
- Separar Auth (Supabase) de regras de jogo/catálogo (API Nest) quando o produto tiver API irmã

## Referências

| Tópico | Arquivo |
| --- | --- |
| Clients SSR | [references/ssr-clients.md](references/ssr-clients.md) |
| Auth | [references/auth.md](references/auth.md) |
| Env e keys | [references/env-and-keys.md](references/env-and-keys.md) |

## Como aplicar

1. Escolher client certo (browser / server / middleware)
2. Proteger rotas com sessão válida; redirect de login explícito
3. API Nest valida JWT; front não reimplementa regras PHB
4. Conferir `.env` (URL + publishable; secret só server)

## Anti-padrões comuns

- Expor `SUPABASE_SERVICE_ROLE_KEY` / secret no cliente
- Criar client novo a cada render sem cuidado com cookies
- Bypass de RLS com service role em fluxos que deveriam ser do usuário

## Relacionado

- `next`, `env-secrets`, `security`, `nestjs` (validação JWT na API)
