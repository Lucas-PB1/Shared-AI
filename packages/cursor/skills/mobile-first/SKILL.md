---
name: mobile-first
description: >-
  Aplica mobile-first: breakpoints, touch, viewport e enhancement progressivo. Use ao desenhar layouts responsivos, otimizar touch ou priorizar performance em redes lentas, ou quando o usuário pedir responsividade.
---

# Mobile-first

## Quando usar

- CSS e layout responsivo
- Targets touch e gestos
- Priorizar conteúdo essencial

## Princípios

- Estilos base para viewport estreito
- Ampliar com min-width queries
- Funcionalidade core sem JS quando possível

## Referências

| Tópico | Arquivo |
| --- | --- |
| Breakpoints | [references/breakpoints.md](references/breakpoints.md) |
| Touch e viewport | [references/touch-and-viewport.md](references/touch-and-viewport.md) |
| Enhancement progressivo | [references/progressive-enhancement.md](references/progressive-enhancement.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `mobile-first` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

