---
name: tailwind
description: >-
  Orienta Tailwind CSS: config, utilities, merge e composição. Use ao estilizar com classes utilitárias, estender tema ou resolver conflitos de classes, ou quando o usuário pedir padrões Tailwind.
---

# Tailwind CSS

## Quando usar

- Configurar tema e plugins
- Compor classes em componentes
- Merge de classes condicionais

## Princípios

- Utilities primeiro; `@apply` com moderação
- Design tokens via theme extend
- Consistência com prettier-plugin-tailwindcss

## Referências

| Tópico | Arquivo |
| --- | --- |
| Configuração | [references/configuration.md](references/configuration.md) |
| Utilities e padrões | [references/utilities-and-patterns.md](references/utilities-and-patterns.md) |
| Merge e composição | [references/merge-and-composability.md](references/merge-and-composability.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `tailwind` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

