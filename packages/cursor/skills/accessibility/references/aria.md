# ARIA

## Regra de ouro

- Não usar ARIA se elemento nativo já comunica papel e estado

## Comum

- `aria-label`, `aria-labelledby`, `aria-describedby`
- `aria-expanded`, `aria-controls` em disclosure
- `role` só quando semântica nativa insuficiente

## Live regions

- `aria-live="polite"` para atualizações não urgentes
- Evitar anunciar demais

## Anti-padrões

- `role="button"` em div sem teclado completo
- aria-hidden em foco ainda tabbable

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

