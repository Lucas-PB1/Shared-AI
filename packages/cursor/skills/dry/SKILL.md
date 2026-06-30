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

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `dry` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

