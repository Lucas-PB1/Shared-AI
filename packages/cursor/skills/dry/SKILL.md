---
name: dry
description: >-
  Aplica DRY: elimina duplicação de código, lógica e conhecimento. Use ao refatorar repetição, extrair abstrações ou quando o usuário pedir centralizar regras em um único lugar.
---

# DRY

## Quando usar

- Código ou regra repetida em 2+ lugares
- Manutenção que exige mudar vários arquivos iguais
- Pedidos explícitos de DRY

## Princípios

- Cada conhecimento autoritativo vive em um lugar
- Substituir todas as cópias após extrair
- Validar equivalência com testes

## Referências

| Tópico | Arquivo |
| --- | --- |
| Padrões de extração | [references/extract-patterns.md](references/extract-patterns.md) |
| Quando não forçar | [references/when-not-to-dry.md](references/when-not-to-dry.md) |

## Relacionado

- `clean-code`, `solid`
