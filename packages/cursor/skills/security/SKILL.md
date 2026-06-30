---
name: security
description: >-
  Orienta segurança no client: XSS, links externos e boas práticas básicas. Use ao renderizar HTML dinâmico, abrir links externos ou revisar superfície de ataque front-end, ou quando o usuário pedir sanitização ou hardening.
---

# Segurança (client)

## Quando usar

- Renderizar conteúdo de usuário
- Links `target=_blank`
- Armazenamento local sensível

## Princípios

- Nunca confiar em input do cliente
- Escapar ou sanitizar HTML
- rel noopener em tabs novas

## Referências

| Tópico | Arquivo |
| --- | --- |
| XSS e sanitização | [references/xss-and-sanitization.md](references/xss-and-sanitization.md) |
| Links externos | [references/external-links.md](references/external-links.md) |
| Básicos client-side | [references/client-side-basics.md](references/client-side-basics.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `security` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

