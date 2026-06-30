# Rotas, layouts e grupos

## Layouts aninhados

- `layout.tsx` persiste entre navegações filhas
- Recebe `children`; ideal para chrome, providers server-side leves

## Rotas aninhadas

- Pastas refletem URL: `app/blog/[slug]/page.tsx`
- `not-found.tsx` por segmento para 404 localizado

## Route groups

- Pasta `(marketing)` não entra na URL
- Organiza código e layouts alternativos no mesmo nível

## Parallel routes (intro)

- Slots `@modal`, `@sidebar` com `default.tsx`
- Útil para modais persistentes ou dashboards multi-pane

## Navegação

- `next/navigation`: `useRouter`, `usePathname`, `Link`
- Prefetch padrão em `Link` para rotas estáticas

## Checklist prático

- [ ] Layout não refaz fetch pesado a cada navegação filha
- [ ] Grupos `( )` só para organização, não para esconder URL errada
- [ ] 404 e not-found testados por segmento crítico

## Exemplos mentais

- **Bom:** auth layout separado de marketing via route group
- **Ruim:** duplicar header em cada page sem layout

## Quando revisitar

- Reestruturação de URLs ou i18n com `[locale]`
