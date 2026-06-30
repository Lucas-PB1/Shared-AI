---
name: clean-code
description: >-
  Aplica princípios de Clean Code: nomes claros, funções pequenas, legibilidade e tratamento de erros. Use ao escrever, refatorar ou revisar código, ou quando o usuário pedir código limpo ou manutenível.
---

# Clean Code

## Quando usar

- Escrever ou refatorar código
- Revisão de PR focada em legibilidade
- Pedidos de código mais limpo

## Princípios

- Código lê de cima para baixo
- Comentários explicam porquê, não o óbvio
- Early return em vez de aninhamento profundo
- Formatação consistente com o projeto

## Referências

| Tópico | Arquivo |
| --- | --- |
| Nomes | [references/naming.md](references/naming.md) |
| Funções | [references/functions.md](references/functions.md) |
| Estrutura e fluxo | [references/structure-and-flow.md](references/structure-and-flow.md) |
| Erros | [references/error-handling.md](references/error-handling.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `clean-code` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

