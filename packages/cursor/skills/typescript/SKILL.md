---
name: typescript
description: >-
  Orienta TypeScript: tipos, generics, narrowing e strict mode. Use ao tipar APIs, refatorar JS para TS ou resolver erros do compilador, ou quando o usuário pedir type safety ou inferência.
---

# TypeScript

## Quando usar

- Definir tipos de domínio e props
- Generics em utilitários
- Habilitar ou manter strict

## Princípios

- Tipos expressam contratos, não só anotações
- Evitar `any`; usar unknown na fronteira
- Narrowing antes de acessar propriedades

## Referências

| Tópico | Arquivo |
| --- | --- |
| Tipos e interfaces | [references/types-and-interfaces.md](references/types-and-interfaces.md) |
| Generics | [references/generics.md](references/generics.md) |
| Narrowing | [references/narrowing.md](references/narrowing.md) |
| Strict mode | [references/strict-mode.md](references/strict-mode.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `typescript` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

