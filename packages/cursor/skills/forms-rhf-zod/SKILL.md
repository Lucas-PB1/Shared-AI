---
name: forms-rhf-zod
description: >-
  Orienta formulários com react-hook-form, Zod e resolvers. Use ao criar forms,
  validação de schema, FormField shadcn ou submit com mutation.
---

# Forms — RHF + Zod

## Quando usar

- Formulários controlados com validação
- Schemas Zod compartilhados (client + tipos)
- Integração com UI (shadcn Form) e mutations

## Princípios

- Schema Zod como fonte de verdade; inferir tipos com `z.infer`
- `zodResolver` no `useForm`; mensagens de erro legíveis
- Validar no submit; `mode` explícito se validar onBlur/onChange
- Não duplicar as mesmas regras em ifs manuais

## Referências

| Tópico | Arquivo |
| --- | --- |
| Schema e form | [references/schema-and-form.md](references/schema-and-form.md) |
| UI e submit | [references/ui-and-submit.md](references/ui-and-submit.md) |

## Como aplicar

1. Definir schema Zod perto do feature slice
2. `useForm({ resolver: zodResolver(schema), defaultValues })`
3. Bind fields; mostrar `formState.errors`
4. Submit → mutation TanStack ou Server Action

## Anti-padrões comuns

- Validar só no servidor sem feedback no client (ou o inverso sem schema compartilhado)
- `register` + state React duplicado
- Schema gigante god-object para vários forms

## Relacionado

- `ui-shadcn`, `tanstack-query`, `typescript`, `zod` via tipos, `accessibility`
