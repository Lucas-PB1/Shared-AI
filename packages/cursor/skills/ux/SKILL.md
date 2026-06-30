---
name: ux
description: >-
  Orienta UX de interface: feedback, hierarquia e padrões de interação. Use ao desenhar fluxos, estados de UI ou microcopy, ou quando o usuário pedir usabilidade, clareza ou redução de fricção.
---

# UX

## Quando usar

- Estados loading/empty/error
- Fluxos multi-step
- Hierarquia visual e copy

## Princípios

- Feedback imediato a ações
- Prevenir erro > corrigir
- Consistência de padrões

## Referências

| Tópico | Arquivo |
| --- | --- |
| Feedback e estados | [references/feedback-and-states.md](references/feedback-and-states.md) |
| Hierarquia e fluxo | [references/hierarchy-and-flow.md](references/hierarchy-and-flow.md) |
| Padrões de interação | [references/interaction-patterns.md](references/interaction-patterns.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `ux` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

