---
name: testing
description: >-
  Orienta testes front-end: Vitest, React Testing Library, user-event e a11y. Use ao escrever ou revisar testes de componentes, ou quando o usuário pedir cobertura, queries acessíveis ou simulação de usuário.
---

# Testing

## Quando usar

- Testes unitários e de componente
- Interações realistas
- Checks de acessibilidade em testes

## Princípios

- Testar comportamento visível ao usuário
- Queries by role/label antes de testId
- Arrange-Act-Assert claro

## Referências

| Tópico | Arquivo |
| --- | --- |
| Vitest | [references/vitest.md](references/vitest.md) |
| RTL | [references/react-testing-library.md](references/react-testing-library.md) |
| user-event | [references/user-event.md](references/user-event.md) |
| A11y em testes | [references/accessibility-testing.md](references/accessibility-testing.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `testing` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

