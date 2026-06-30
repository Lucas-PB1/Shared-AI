# Nomenclatura CSS

## Metodologias

- BEM ou utilitários consistentes com o projeto
- Nome reflete estrutura ou função, não cor atual

## Especificidade

- Preferir uma classe por elemento quando possível
- Evitar `#id` e `!important` salvo exceções documentadas

## Estados

- Sufixos ou data attributes: `--active`, `.is-open`, `[aria-expanded]`

## Coesão

- Prefixo por componente (`card__title`, `btn--primary`)

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

