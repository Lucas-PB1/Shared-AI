# Review workflow

## Autor

- Self-review antes de pedir review
- Responder com contexto, não defensiva

## Revisor

- Claridade, bugs, testes, segurança, a11y conforme escopo
- Aprovar quando confortável; nit opcional vs blocking

## Merge

- Squash ou merge commit conforme política do repo
- Branch atualizada com base antes de merge crítico

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

