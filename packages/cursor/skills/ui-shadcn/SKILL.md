---
name: ui-shadcn
description: >-
  Orienta UI com shadcn/Base UI: primitives, CVA, tokens e composição. Use ao
  gerar/ajustar componentes shadcn, class-variance-authority ou design system.
---

# UI — shadcn / Base UI

## Quando usar

- Adicionar ou customizar componentes do design system
- Variantes com CVA (`class-variance-authority`)
- Compor primitives (Dialog, Button, Form) sem reinventar a11y

## Princípios

- Preferir primitive existente antes de componente one-off
- Variantes via CVA + `cn` / `tailwind-merge`; tokens do tema
- Acessibilidade herdada do primitive — não remover focus rings sem substituto
- Manter camada `shared/ui` ou `design-system` como único lugar de primitivos

## Referências

| Tópico | Arquivo |
| --- | --- |
| Primitives e CVA | [references/primitives-and-cva.md](references/primitives-and-cva.md) |
| Temas e tokens | [references/theme-and-tokens.md](references/theme-and-tokens.md) |

## Como aplicar

1. Ver se já existe componente em `shared/ui` / design-system
2. Estender com variante CVA em vez de fork CSS ad hoc
3. Usar ícones do pacote já adotado (lucide / heroicons)
4. Validar teclado e contraste

## Anti-padrões comuns

- Copiar JSX shadcn para dentro de feature sem passar pelo shared
- Override com `!important` / estilos inline contra o tema
- Dialog/Sheet sem foco e Esc

## Relacionado

- `tailwind`, `accessibility`, `ux`, `react`, `forms-rhf-zod`
