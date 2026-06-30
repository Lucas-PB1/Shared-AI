---
name: no-magic-numbers
description: >-
  Substitui números e strings literais mágicas por constantes nomeadas. Use ao revisar valores hardcoded, limites, timeouts ou enums espalhados, ou quando o usuário pedir constantes semânticas.
---

# Sem números mágicos

## Quando usar

- Literais numéricos ou strings repetidas
- Limites, timeouts, status codes sem nome
- Refatoração para legibilidade

## Princípios

- Nome expressa unidade e propósito
- Agrupar constantes relacionadas
- Evitar constantes que só mascaram um único uso óbvio

## Referências

| Tópico | Arquivo |
| --- | --- |
| Organização de constantes | [references/constants-organization.md](references/constants-organization.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `no-magic-numbers` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

