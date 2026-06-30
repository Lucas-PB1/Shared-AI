---
name: solid
description: >-
  Orienta design orientado a objetos e composição com SOLID. Use ao modelar módulos, interfaces e dependências, ou quando o usuário pedir desacoplamento, extensibilidade ou responsabilidades claras.
---

# SOLID

## Quando usar

- Modelar domínio ou camadas de serviço
- Refatorar classes ou módulos acoplados
- Discutir extensibilidade e testabilidade

## Princípios

- Preferir composição a herança profunda
- Interfaces pequenas e específicas
- Depender de abstrações, não de concretos

## Referências

| Tópico | Arquivo |
| --- | --- |
| SRP | [references/srp.md](references/srp.md) |
| OCP | [references/ocp.md](references/ocp.md) |
| LSP | [references/lsp.md](references/lsp.md) |
| ISP | [references/isp.md](references/isp.md) |
| DIP | [references/dip.md](references/dip.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `solid` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

