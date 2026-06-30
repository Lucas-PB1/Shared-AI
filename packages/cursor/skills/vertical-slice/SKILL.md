---
name: vertical-slice
description: >-
  Organiza código por feature ou capacidade end-to-end (vertical slice), não só por camada horizontal. Use ao reduzir acoplimento entre times, entregar incrementos coesos ou evitar pastas técnicas gigantes.
---

# Vertical slice

## Quando usar

- Features entregues de forma independente
- Monolito modular ou codebase compartilhado entre squads
- Fricção alta ao tocar “camada X” para toda mudança pequena

## Princípios

- Co-localizar o que muda junto (entrada, regra, persistência da feature)
- Compartilhar apenas kernel estável (shared/domain comum)
- Fatia fina a grossa conforme complexidade, não dogma de tamanho

## Referências

| Tópico | Arquivo |
| --- | --- |
| Estrutura da fatia | [references/slice-structure.md](references/slice-structure.md) |
| vs camadas horizontais | [references/vs-horizontal-layers.md](references/vs-horizontal-layers.md) |
| Fatias no frontend | [references/frontend-slices.md](references/frontend-slices.md) |

## Como aplicar

1. Nomear fatia pelo comportamento do usuário ou capacidade de negócio
2. Manter dependências entre fatias explícitas e mínimas
3. Extrair para `shared` só após segunda ou terceira repetição comprovada
4. Preservar regra de dependência do domínio dentro de cada fatia

## Anti-padrões comuns

- Fatia = pasta com um arquivo solto e resto ainda horizontal
- `shared` virando lixeira sem ownership
- Duplicar integrações idênticas em cada fatia sem contrato comum
- Cortar fatia por camada técnica (“slice-api”, “slice-db”)

## Relacionado

- `layered-architecture` — complementar dentro de cada fatia se necessário
- `clean-architecture` — casos de uso naturalmente por capacidade
- `domain-driven-design` — bounded context ≈ fronteira de fatia
- `atomic-design` — composição de UI dentro de uma fatia de frontend
- `dry` — extrair shared com critério, não prematuramente
