# Breakpoints

## Estratégia

- Definir poucos breakpoints alinhados ao conteúdo, não a devices
- Nomear por escala (`sm`, `md`) ou uso documentado

## CSS

- `min-width` crescente a partir do mobile
- Evitar breakpoints só para um componente — prefer container queries

## Conteúdo

- Priorizar above-the-fold em telas pequenas
- Não esconder informação crítica só em mobile

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

