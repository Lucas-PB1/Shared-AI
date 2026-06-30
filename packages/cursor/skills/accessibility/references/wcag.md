# WCAG

## Níveis

- AA como alvo comum para produtos públicos
- Perceivable, Operable, Understandable, Robust (POUR)

## Checklist rápido

- Texto alternativo para não-texto
- Contraste mínimo 4.5:1 texto normal
- Redimensionar até 200% sem perda de função

## Conteúdo

- Linguagem clara; erros identificados e sugeridos
- Timeout com aviso ou extensão quando possível

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

