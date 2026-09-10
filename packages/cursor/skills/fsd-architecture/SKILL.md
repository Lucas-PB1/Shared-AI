---
name: fsd-architecture
description: >-
  Aplica Feature-Sliced Design: camadas app/widgets/features/entities/shared e
  regra de imports. Use ao organizar pastas Next/React, criar features ou
  revisar imports entre camadas FSD.
---

# Feature-Sliced Design (FSD)

## Quando usar

- Estruturar `src/` em app → widgets → features → entities → shared
- Criar nova feature/slice ou mover código entre camadas
- Revisar imports que violam a hierarquia

## Princípios

- Dependência só para baixo: `app` → `widgets` → `features` → `entities` → `shared`
- `shared` importa só pacotes npm (nunca camadas superiores)
- Grupo de pastas (ex.: `features/catalog/`) não é slice — importe o slice concreto
- Public API do slice via `index.ts` quando necessário; evitar barrels gigantes

## Referências

| Tópico | Arquivo |
| --- | --- |
| Camadas e imports | [references/layers-and-imports.md](references/layers-and-imports.md) |
| Slices e public API | [references/slices-and-public-api.md](references/slices-and-public-api.md) |

## Como aplicar

1. Identificar a camada correta do artefato (UI composta → widget; ação do usuário → feature; modelo → entity)
2. Criar pasta do slice; expor só o necessário em `index.ts`
3. Conferir imports (sem cima → baixo invertido)
4. Regras de negócio de domínio externo (ex.: PHB) ficam na API, não no front

## Anti-padrões comuns

- Importar `features` de dentro de `entities` ou `shared`
- Lógica de domínio pesada no Next quando existe API irmã
- Pasta-grupo usada como módulo (`@/features/catalog` sem slice)

## Relacionado

- `solid`, `react`, `next`
- `domain-driven-design` na API (BCs), não misturar com FSD do front
