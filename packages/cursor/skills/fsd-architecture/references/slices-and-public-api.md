# Slices e public API

## Slice

Unidade de feature com pastas internas típicas: `ui/`, `model/`, `api/`, `lib/` (só o que existir).

Grupos (`features/catalog/`, `features/character/`) só organizam — **não** têm public API própria.

## Public API

- Preferir import profundo do slice: `@/features/catalog/class-catalog`
- Se houver `index.ts`, exportar só o contrato estável (componentes/hooks públicos)
- Evitar aggregators nomeados soltos na raiz do grupo

## Nova feature (checklist)

1. `entities/<nome>/` — tipos / model leve
2. `features/<grupo>/<slice>/` — UI + hooks + chamadas API
3. Wire em `app/` ou widget
4. Validar imports com a matriz FSD
