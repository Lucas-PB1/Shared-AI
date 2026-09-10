---
name: next
description: >-
  Orienta Next.js App Router: RSC, Server/Client Components, data fetching, layouts, metadata e cache. Use com Next.js, App Router, RSC, Server Components, next/navigation ou ao estruturar rotas e SEO.
---

# Next.js (App Router)

## Quando usar

- Escolher App Router vs Pages ou convenções de arquivos
- Limites entre Server e Client Components
- Fetch, Server Actions, loading e revalidação

## Princípios

- Server Components por padrão; 'use client' só onde há interatividade ou APIs do browser
- Colocar dados perto do servidor; evitar waterfall desnecessário
- Metadata e cache explícitos quando o comportamento estático/dinâmico importa

## Referências

| Tópico | Arquivo |
| --- | --- |
| App Router | [references/app-router.md](references/app-router.md) |
| Server e Client | [references/server-and-client-components.md](references/server-and-client-components.md) |
| Data fetching | [references/data-fetching.md](references/data-fetching.md) |
| Rotas e layouts | [references/routing-and-layouts.md](references/routing-and-layouts.md) |
| Metadata e SEO | [references/metadata-and-seo.md](references/metadata-and-seo.md) |
| Cache | [references/caching-and-revalidation.md](references/caching-and-revalidation.md) |
| Proxy / sessão | [references/proxy-and-session.md](references/proxy-and-session.md) |
| Route Handlers | [references/route-handlers.md](references/route-handlers.md) |

## Como aplicar

1. Identificar se a rota é estática, dinâmica ou híbrida
2. Ler a referência do tópico (RSC, fetch, layout, metadata)
3. Aplicar o padrão mínimo; extrair Client Components só onde necessário
4. Validar loading, erro e SEO conforme o caso

## Anti-padrões comuns

- Marcar use client no root layout ou páginas só para usar um hook pontual
- Fetch duplicado em layout e page sem compor ou cache coerente
- Ignorar generateMetadata em páginas públicas indexáveis

## Relacionado

- Skill `react` para UI, hooks e forms no client
- Skill `typescript` para tipos de props e Server Actions
- Skill `supabase` para Auth SSR / proxy de sessão
- Skill `tanstack-query` para cache no client
- Skill `fsd-architecture` para organização `src/`
