# Cache e revalidação

## Modelo mental

- Request memoization (fetch igual no mesmo render)
- Data Cache (fetch entre requests)
- Full Route Cache (HTML/RSC payload estático)

## fetch options

- `cache: 'force-cache'` — estático (default em muitos casos)
- `cache: 'no-store'` — dinâmico por request
- `next: { revalidate: 60 }` — ISR em segundos
- `next: { tags: ['posts'] }` — invalidação seletiva

## Segment config

- `export const dynamic = 'force-dynamic'`
- `export const revalidate = 3600`
- Preferir tags + `revalidateTag` para conteúdo editorial

## Dinâmico vs estático

- Cookies, headers, searchParams não cacheados → rota dinâmica
- Planejar build: rotas estáticas no deploy, resto on-demand

## Checklist prático

- [ ] Conteúdo público lento usa revalidate, não no-store sem motivo
- [ ] Mutations disparam revalidatePath/tag certos
- [ ] Preview/draft não serve cache de produção

## Exemplos mentais

- **Bom:** CMS com revalidate 300 e tag por coleção
- **Ruim:** no-store global por medo de cache

## Quando revisitar

- Incidente de conteúdo stale ou custo de origin alto
