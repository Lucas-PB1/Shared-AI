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

## Relacionado

- `clean-code`
