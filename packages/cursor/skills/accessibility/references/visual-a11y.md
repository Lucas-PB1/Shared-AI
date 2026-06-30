# Acessibilidade visual

## Contraste

- Verificar texto, ícones e estados focus
- Não usar cor como único indicador de erro/sucesso

## Motion

- Respeitar `prefers-reduced-motion`
- Evitar flash ou animação contínua distrativa

## Zoom e reflow

- Layout reflow em 320px width equivalente
- Texto não truncado de forma que impede leitura

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

