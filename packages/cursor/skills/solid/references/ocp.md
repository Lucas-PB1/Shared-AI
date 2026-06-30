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

## Checklist prático

- [ ] Comportamento atual documentado ou coberto por teste antes de mudar
- [ ] Nomes e contratos claros para quem lê o código pela primeira vez
- [ ] Edge cases relevantes considerados (vazio, erro, mobile, teclado)
- [ ] Nenhum segredo ou dado sensível exposto inadvertidamente

## Exemplos mentais

- **Bom:** mudança pequena, intenção evidente no diff, fácil de reverter
- **Ruim:** abstração genérica usada uma vez, ou fix local que duplica regra global

## Quando revisitar

- Após feedback de review, bug em produção ou mudança de requisito
- Quando o mesmo padrão aparecer pela terceira vez (considerar extrair)

