---
name: hexagonal-architecture
description: >-
  Aplica arquitetura hexagonal (ports and adapters): núcleo isolado, portas explícitas e adaptadores substituíveis. Use ao integrar múltiplos drivers, testar no domínio ou trocar infra sem reescrever regras.
---

# Arquitetura hexagonal

## Quando usar

- Várias formas de acionar o mesmo domínio (HTTP, mensagens, schedule)
- Necessidade de simular infra em testes
- Substituição planejada de banco, fila ou provedor externo

## Princípios

- Aplicação no centro; mundo externo nos adaptadores
- Portas definem contratos; adaptadores implementam
- Driving (primary) inicia fluxo; driven (secondary) é acionado pelo núcleo

## Referências

| Tópico | Arquivo |
| --- | --- |
| Portas e adaptadores | [references/ports-and-adapters.md](references/ports-and-adapters.md) |
| Driving vs driven | [references/driving-vs-driven.md](references/driving-vs-driven.md) |
| Testes nas bordas | [references/testing-at-boundaries.md](references/testing-at-boundaries.md) |

## Como aplicar

1. Listar interações do sistema com o exterior (entrada e saída)
2. Declarar portas no núcleo para cada interação necessária
3. Implementar adaptadores finos por tecnologia (REST, JDBC, SMTP)
4. Compor aplicação injetando adaptadores na borda de deploy

## Anti-padrões comuns

- Portas que espelham API de framework em vez de necessidade do domínio
- Adaptadores com lógica de negócio “só um pouco”
- Hexágono desenhado no diagrama mas imports cruzados no código
- Um adaptador god-object para todas as integrações

## Relacionado

- `clean-architecture` — anéis equivalentes; vocabulário diferente
- `layered-architecture` — base comum; hexágono enfatiza simetria das bordas
- `repository` — porta driven clássica
- `domain-driven-design` — modelagem rica dentro do hexágono
- `solid` — DIP na definição de portas
