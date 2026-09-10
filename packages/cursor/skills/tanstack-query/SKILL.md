---
name: tanstack-query
description: >-
  Orienta TanStack Query: query keys, cache, mutations, invalidação e Devtools.
  Use com @tanstack/react-query, useQuery, useMutation ou fetching no client.
---

# TanStack Query

## Quando usar

- Fetching/cache no Client Component
- Mutations com invalidação de listas/detalhe
- Estados loading / error / stale

## Princípios

- Query keys estáveis e hierárquicas (`['characters', id]`)
- Server Components / fetch RSC para dados iniciais quando fizer sentido; Query no client para interatividade
- Invalidar após mutation; não duplicar source of truth ad hoc
- Tratar erro na UI (empty/error states)

## Referências

| Tópico | Arquivo |
| --- | --- |
| Query keys e cache | [references/query-keys-and-cache.md](references/query-keys-and-cache.md) |
| Mutations | [references/mutations.md](references/mutations.md) |

## Como aplicar

1. Definir key factory no slice/feature
2. `useQuery` com `queryFn` apontando ao client da API
3. `useMutation` + `invalidateQueries` no sucesso
4. Não refetch cego em todo focus se o dado for estável — ajustar `staleTime`

## Anti-padrões comuns

- Keys literais espalhadas sem convenção
- Guardar resposta da API também em useState redundante
- Mutation sem invalidar queries relacionadas

## Relacionado

- `react`, `next`, `forms-rhf-zod`, `fsd-architecture`
