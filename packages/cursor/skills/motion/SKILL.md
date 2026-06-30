---
name: motion
description: >-
  Orienta animação com Motion (motion/react): acessibilidade e performance. Use ao animar transições de UI, gestos ou layout, ou quando o usuário pedir reduced motion ou animações fluidas.
---

# Motion

## Quando usar

- Transições de entrada/saída
- Gestos e layout animation
- Respeitar preferências de movimento

## Princípios

- Animar transform/opacity preferencialmente
- Reduced motion como default sensato
- Durações curtas em micro-interações

## Referências

| Tópico | Arquivo |
| --- | --- |
| motion/react | [references/motion-react.md](references/motion-react.md) |
| Acessibilidade | [references/accessibility-motion.md](references/accessibility-motion.md) |
| Performance | [references/performance.md](references/performance.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `motion` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

