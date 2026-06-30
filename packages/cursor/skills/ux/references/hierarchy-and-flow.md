# Hierarquia e fluxo

## Visual

- Um foco primário por tela
- Agrupamento por proximidade e tipografia

## Fluxo

- Passos lineares numerados quando complexo
- Voltar sem perder dados (autosave, confirmação)

## Copy

- Verbos nos CTAs; títulos escaneáveis
- Jargão mínimo alinhado ao público

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

