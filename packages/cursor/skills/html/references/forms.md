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
