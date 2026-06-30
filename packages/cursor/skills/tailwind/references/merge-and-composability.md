# Merge e composição

## Conflitos

- `tailwind-merge` ou `cn()` helper para props `className`
- Última classe vence — ordem importa no merge

## Variants

- cva/class-variance-authority para variantes tipadas

## Anti-padrões

- Strings template gigantes ilegíveis
- Arbitrary values `[123px]` sem token quando repetido

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

