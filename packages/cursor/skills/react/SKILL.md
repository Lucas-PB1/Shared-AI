---
name: react
description: >-
  Orienta React: componentes, hooks, estado, context, performance, forms e erros. Use ao construir UI React, refatorar hooks ou otimizar renders, ou quando o usuário pedir padrões idiomáticos React.
---

# React

## Quando usar

- Componentes e composição
- Estado local e compartilhado
- Forms e error boundaries

## Princípios

- Componentes puros quando possível
- Estado mínimo derivável calculado
- Keys estáveis em listas

## Referências

| Tópico | Arquivo |
| --- | --- |
| Componentes | [references/components.md](references/components.md) |
| Hooks | [references/hooks.md](references/hooks.md) |
| Estado | [references/state.md](references/state.md) |
| Context API | [references/context-api.md](references/context-api.md) |
| Performance | [references/performance.md](references/performance.md) |
| Forms | [references/forms.md](references/forms.md) |
| Erros | [references/error-handling.md](references/error-handling.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `react` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

