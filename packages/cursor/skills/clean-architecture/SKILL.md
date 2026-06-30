---
name: clean-architecture
description: >-
  Aplica Clean Architecture: regra de dependência, entidades, casos de uso e adaptadores. Use ao desenhar núcleo de domínio independente de framework, UI ou banco.
---

# Clean Architecture

## Quando usar

- Domínio com regras estáveis e infra mutável
- Múltiplas interfaces (API, CLI, jobs) sobre mesma lógica
- Testes de negócio sem ambiente completo

## Princípios

- Dependências apontam para o centro (entidades e casos de uso)
- Frameworks e banco são detalhes na periferia
- Boundaries explícitas entre camadas conceituais

## Referências

| Tópico | Arquivo |
| --- | --- |
| Camadas e dependências | [references/layers-and-dependencies.md](references/layers-and-dependencies.md) |
| Casos de uso | [references/use-cases.md](references/use-cases.md) |
| Entidades e boundaries | [references/entities-and-boundaries.md](references/entities-and-boundaries.md) |

## Como aplicar

1. Modelar entidades e invariantes no centro
2. Implementar casos de uso que orquestram entidades e portas
3. Definir interfaces (portas) que a infra implementa
4. Colocar controllers, gateways e presenters nos adaptadores externos

## Anti-padrões comuns

- Entidades anêmicas e toda lógica nos casos de uso
- Casos de uso que conhecem HTTP ou SQL
- “Clean” com dezenas de pastas vazias antes de ter domínio
- DTOs duplicados sem propósito entre anéis

## Relacionado

- `hexagonal-architecture` — mesma ideia com vocabulário ports/adapters
- `layered-architecture` — predecessor comum; migrar quando dependências invertem
- `domain-driven-design` — linguagem e agregados no núcleo
- `repository` — porta típica na borda driven
- `solid` — DIP e ISP nos contratos entre anéis
