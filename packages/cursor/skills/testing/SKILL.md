---
name: testing
description: >-
  Orienta testes: Vitest/RTL (front), Jest Nest, Cypress e2e e a11y. Use ao
  escrever ou revisar testes unitários, de componente ou e2e.
---

# Testing

## Quando usar

- Testes unitários e de componente (Vitest + RTL)
- Testes Nest (Jest + `@nestjs/testing` + supertest)
- E2E (Cypress)
- Checks de acessibilidade em testes

## Princípios

- Testar comportamento observável
- Front: queries by role/label antes de testId
- API: testar contrato HTTP e guards; isolar DB com setup explícito
- E2E para fluxos críticos, não para cada detalhe de UI

## Referências

| Tópico | Arquivo |
| --- | --- |
| Vitest (front) | [references/vitest.md](references/vitest.md) |
| RTL | [references/react-testing-library.md](references/react-testing-library.md) |
| user-event | [references/user-event.md](references/user-event.md) |
| A11y em testes | [references/accessibility-testing.md](references/accessibility-testing.md) |
| Jest + Nest | [references/jest-nestjs.md](references/jest-nestjs.md) |
| Cypress e2e | [references/cypress.md](references/cypress.md) |

## Como aplicar

1. Escolher camada: unit/component (Vitest) vs Nest (Jest) vs e2e (Cypress)
2. Ler a referência correspondente
3. Cobrir o caminho feliz + 1–2 erros relevantes
4. Manter testes determinísticos (sem flake de tempo/rede sem mock)

## Anti-padrões comuns

- E2E para lógica que um unit resolve
- Snapshot gigante sem asserção de comportamento
- Teste Nest que depende de banco real sem documentar pré-requisito

## Relacionado

- `react`, `next`, `nestjs`, `accessibility`
