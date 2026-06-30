# Touch e viewport

## Meta viewport

- `width=device-width, initial-scale=1`
- Evitar `user-scalable=no` salvo casos justificados

## Targets

- Mínimo ~44×44px área clicável
- Espaço entre links adjacentes

## Inputs

- `font-size` ≥16px em iOS evita zoom indesejado
- Tipos corretos (`email`, `tel`) abrem teclado adequado

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

