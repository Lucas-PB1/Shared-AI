---
name: accessibility
description: >-
  Aplica acessibilidade web: WCAG, ARIA, teclado e inclusão visual. Use ao implementar UI, revisar componentes ou corrigir issues de a11y, ou quando o usuário pedir conformidade ou navegação inclusiva.
---

# Acessibilidade

## Quando usar

- Novos componentes interativos
- Auditoria WCAG ou teclado
- Correção de issues de leitor de tela

## Princípios

- HTML semântico primeiro; ARIA quando necessário
- Foco visível e ordem lógica
- Contraste e não depender só de cor

## Referências

| Tópico | Arquivo |
| --- | --- |
| WCAG | [references/wcag.md](references/wcag.md) |
| ARIA | [references/aria.md](references/aria.md) |
| Teclado | [references/keyboard-navigation.md](references/keyboard-navigation.md) |
| Visual | [references/visual-a11y.md](references/visual-a11y.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `accessibility` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

