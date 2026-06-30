---
name: javascript
description: >-
  Orienta JavaScript moderno: async, módulos e runtime. Use ao escrever lógica client ou server em JS, depurar Promises ou organizar imports, ou quando o usuário pedir ES modules ou padrões assíncronos.
---

# JavaScript

## Quando usar

- Código assíncrono e APIs
- Estrutura de módulos
- Comportamento de runtime (event loop, tipos)

## Princípios

- Preferir async/await legível
- Imports explícitos e tree-shake friendly
- Imutabilidade onde reduz bugs

## Referências

| Tópico | Arquivo |
| --- | --- |
| Async e Promises | [references/async-and-promises.md](references/async-and-promises.md) |
| Módulos | [references/modules-and-imports.md](references/modules-and-imports.md) |
| Runtime | [references/runtime-basics.md](references/runtime-basics.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `javascript` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

