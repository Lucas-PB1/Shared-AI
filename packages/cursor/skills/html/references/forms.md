# Formulários

## Associação

- Cada input com `label` (`for`/`id` ou label envolvendo)
- `fieldset` + `legend` para grupos relacionados

## Tipos e validação

- `type`, `inputmode`, `autocomplete` adequados
- `required`, `pattern`, `min`/`max` quando nativo bastar
- Mensagens de erro ligadas via `aria-describedby`

## Submit e estados

- Botão submit explícito; não submit só com Enter em campos isolados sem contexto
- `disabled` vs `readonly` conforme intenção

## Acessibilidade

- Não depender só de cor para erro
- Ordem de tab lógica

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

