# Metadata e SEO

## export const metadata

- Objeto estático em `layout.tsx` ou `page.tsx`
- title, description, robots, alternates

## generateMetadata

- Async; acesso a params e fetch para título/descrição dinâmicos
- Retorna `Metadata` ou `Promise<Metadata>`

## Open Graph e Twitter

- `openGraph: { title, description, images, url }`
- `twitter: { card, title, images }` alinhado ao OG

## Boas práticas

- Um canonical por URL pública
- Imagens OG com dimensões adequadas (ex.: 1200×630)
- Evitar título duplicado em layout e page (merge rules do Next)

## Checklist prático

- [ ] Páginas indexáveis têm title e description únicos
- [ ] OG image absoluta (URL completa)
- [ ] noindex só onde intencional (admin, preview)

## Exemplos mentais

- **Bom:** generateMetadata por slug de blog post
- **Ruim:** metadata genérica em todas as rotas dinâmicas

## Quando revisitar

- Mudança de domínio, locale ou estrutura de slug
- Auditoria SEO ou compartilhamento social
