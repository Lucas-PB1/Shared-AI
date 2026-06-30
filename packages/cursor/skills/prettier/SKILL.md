---
name: prettier
description: >-
  Orienta Prettier: config e convenções de formatação. Use ao padronizar style, resolver conflitos format-on-save ou integrar com ESLint, ou quando o usuário pedir formatação automática.
---

# Prettier

## Quando usar

- Config do projeto
- Integração CI e pre-commit
- Convenções de equipe

## Princípios

- Formatter único — debates de style na config
- Não hand-format o que Prettier cobre
- tailwind plugin quando usar Tailwind

## Referências

| Tópico | Arquivo |
| --- | --- |
| Configuração | [references/configuration.md](references/configuration.md) |
| Convenções | [references/formatting-conventions.md](references/formatting-conventions.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `prettier` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

