---
name: eslint
description: >-
  Orienta ESLint: config, rules, plugins React e TypeScript. Use ao configurar lint, corrigir violations ou alinhar padrões de código, ou quando o usuário pedir regras ou flat config.
---

# ESLint

## Quando usar

- Configurar ESLint flat ou legacy
- Regras e plugins
- Integração React/TS

## Princípios

- Regras que previnem bugs > estilo puro
- Overrides por pasta quando necessário
- CI falha em errors, warnings documentados

## Referências

| Tópico | Arquivo |
| --- | --- |
| Configuração | [references/configuration.md](references/configuration.md) |
| Rules e plugins | [references/rules-and-plugins.md](references/rules-and-plugins.md) |
| React e TypeScript | [references/react-and-typescript.md](references/react-and-typescript.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `eslint` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

