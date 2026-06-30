---
name: css
description: >-
  Orienta CSS: layout, nomenclatura, manutenção e design tokens. Use ao estilizar interfaces, refatorar folhas de estilo ou definir variáveis, ou quando o usuário pedir consistência visual ou arquitetura CSS.
---

# CSS

## Quando usar

- Layout responsivo e grid/flex
- Organizar folhas de estilo
- Tokens e temas

## Princípios

- Preferir flex/grid a floats para layout
- Especificidade baixa e previsível
- Tokens para cor, espaço e tipo

## Referências

| Tópico | Arquivo |
| --- | --- |
| Layout | [references/layout.md](references/layout.md) |
| Nomenclatura | [references/naming.md](references/naming.md) |
| Manutenção | [references/maintenance.md](references/maintenance.md) |
| Variáveis e tokens | [references/variables-and-tokens.md](references/variables-and-tokens.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `css` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

