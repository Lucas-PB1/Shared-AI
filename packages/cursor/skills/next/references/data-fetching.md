# Data fetching

## Fetch em RSC

- `async function Page()` e `await fetch(...)` no Server Component
- Opções `cache`, `next: { revalidate, tags }` controlam persistência
- Compor requests no mesmo render quando possível (dedupe automático em fetch igual)

## Server Actions

- `'use server'` em função ou arquivo
- Mutations de form: `action={submit}` sem API route manual
- Revalidar com `revalidatePath` / `revalidateTag` após sucesso

## Loading states

- `loading.tsx` → Suspense boundary por segmento
- `<Suspense fallback={...}>` para partes lentas da page
- `error.tsx` para falhas de render/fetch recuperáveis

## Checklist prático

- [ ] Erro de fetch tratado (error boundary ou resultado tipado)
- [ ] Mutations invalidam cache/tag correto
- [ ] Evitar fetch no client só para espelhar o server

## Exemplos mentais

- **Bom:** page server busca dados; client só interage
- **Ruim:** useEffect + fetch duplicando o que o RSC já fez

## Quando revisitar

- Ao trocar origem de dados (CMS, GraphQL, edge)
- Quando aparecer loading flash ou stale UI após mutation
