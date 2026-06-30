# React Testing Library

## Queries

- Prioridade: role, label, text, placeholder, testId último recurso
- `within` para escopo em componentes grandes

## Render

- `render` + providers necessários (router, theme)
- Não testar state interno — testar output

## Cleanup

- Automático; evitar dependência entre testes

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

