---
name: domain-driven-design
description: >-
  Aplica Domain-Driven Design: linguagem ubíqua, bounded contexts e padrões táticos (entidade, value object, agregado). Use em domínio complexo, alinhamento negócio–código ou fronteiras entre subdomínios.
---

# Domain-Driven Design

## Quando usar

- Regras de negócio densas, mutáveis e mal compreendidas no código
- Múltiplos times ou produtos sobre o mesmo universo de dados
- Ambiguidade de termos (“cliente”, “pedido”) entre áreas

## Princípios

- Código reflete linguagem falada com especialistas de domínio
- Contextos delimitados com contratos explícitos entre eles
- Modelo rico onde a complexidade justifica; evitar DDD cerimonial

## Referências

| Tópico | Arquivo |
| --- | --- |
| Design estratégico | [references/strategic-design.md](references/strategic-design.md) |
| Padrões táticos | [references/tactical-patterns.md](references/tactical-patterns.md) |
| Quando usar DDD | [references/when-to-use-ddd.md](references/when-to-use-ddd.md) |

## Como aplicar

1. Event storming ou workshops para vocabulary e fluxos
2. Desenhar bounded contexts e mapa de contextos
3. Modelar agregados com invariantes claras dentro de cada contexto
4. Integrar contextos via ACL, eventos ou APIs publicadas

## Anti-padrões comuns

- Agregados gigantes “ porque tudo está relacionado”
- Ubiquitous language só no glossário PDF, código com nomes genéricos
- DDD em CRUD simples com custo de cerimônia > benefício
- Um único modelo global forçado entre departamentos

## Relacionado

- `clean-architecture` — entidades e casos de uso hospedam o modelo tático
- `hexagonal-architecture` — integração entre contextos via adaptadores
- `vertical-slice` — fatia pode coincidir com capacidade dentro do contexto
- `repository` — persistência de agregados
- `solid` — encapsulamento e responsabilidade nos agregados
