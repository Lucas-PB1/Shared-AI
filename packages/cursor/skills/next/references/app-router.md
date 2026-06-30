# App Router vs Pages

## App Router (recomendado em projetos novos)

- Diretório `app/` com rotas baseadas em pastas
- Layouts aninhados, loading.js, error.js, route handlers
- React Server Components como padrão

## Pages Router (legado)

- Diretório `pages/` com `getServerSideProps`, `getStaticProps`
- Mantido para apps existentes; migração incremental possível

## Convenções de arquivo (app/)

| Arquivo | Função |
| --- | --- |
| `page.tsx` | UI da rota |
| `layout.tsx` | Shell compartilhado |
| `loading.tsx` | Suspense fallback |
| `error.tsx` | Error boundary da rota |
| `route.ts` | API Route Handler |

## Checklist prático

- [ ] Nova feature em `app/` salvo restrição do projeto
- [ ] Segmentos dinâmicos com `[param]` documentados
- [ ] Colocation: componentes privados ao lado da rota quando local

## Exemplos mentais

- **Bom:** `/app/dashboard/settings/page.tsx` com layout só de dashboard
- **Ruim:** misturar `pages/` e `app/` na mesma URL sem plano

## Quando revisitar

- Upgrade major do Next.js (release notes de routing)
- Ao unificar rotas duplicadas entre routers
