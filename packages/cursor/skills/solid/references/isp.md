# Interface Segregation Principle

## Ideia

- Clientes não devem depender de métodos que não usam
- Preferir várias interfaces pequenas a uma “God interface”

## Na prática

- Props de componente enxutas; composição em vez de prop monolítica
- APIs REST granulares vs endpoint que faz tudo

## React

- Split de contextos por domínio (auth vs theme vs cart)

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

