# Open/Closed Principle

## Ideia

- Aberto para extensão, fechado para modificação
- Novos comportamentos via novos tipos/strategies, não editando switch central

## Na prática

- Strategy pattern, plugins, registries
- Evitar `if (type === 'x')` que cresce a cada feature

## Trade-off

- Não over-engineer extensibilidade que nunca será usada
- YAGNI até segundo ou terceiro caso real
