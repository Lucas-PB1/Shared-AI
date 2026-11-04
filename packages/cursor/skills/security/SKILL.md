---
name: security
description: >-
  Orienta segurança no client: XSS, links externos e boas práticas básicas. Use ao renderizar HTML dinâmico, abrir links externos ou revisar superfície de ataque front-end, ou quando o usuário pedir sanitização ou hardening.
---

# Segurança (client)

## Quando usar

- Renderizar conteúdo de usuário
- Links `target=_blank`
- Armazenamento local sensível

## Princípios

- Nunca confiar em input do cliente
- Escapar ou sanitizar HTML
- rel noopener em tabs novas

## Referências

| Tópico | Arquivo |
| --- | --- |
| XSS e sanitização | [references/xss-and-sanitization.md](references/xss-and-sanitization.md) |
| Links externos | [references/external-links.md](references/external-links.md) |
| Básicos client-side | [references/client-side-basics.md](references/client-side-basics.md) |

## Relacionado

- `env-secrets`, `supabase`
