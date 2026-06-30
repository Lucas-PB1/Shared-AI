---
name: repository
description: >-
  Aplica o padrão Repository: abstrair persistência com contrato orientado ao domínio. Use ao isolar agregados de ORM/SQL, facilitar testes ou centralizar queries de uma entidade raiz.
---

# Repository

## Quando usar

- Casos de uso precisam carregar/persistir agregados sem SQL espalhado
- Troca ou mock de persistência em testes
- Múltiplas fontes (DB + cache) atrás de uma API coesa

## Princípios

- Interface expressa linguagem de domínio (findById, save), não tabela
- Um repositório por agregado raiz (regra usual DDD)
- Implementação na infra; contrato no domínio ou camada de aplicação

## Referências

| Tópico | Arquivo |
| --- | --- |
| Interface e contrato | [references/interface-and-contract.md](references/interface-and-contract.md) |
| Implementação | [references/implementation.md](references/implementation.md) |
| Unit of Work | [references/unit-of-work.md](references/unit-of-work.md) |
| Quando usar | [references/when-to-use.md](references/when-to-use.md) |

## Como aplicar

1. Identificar raiz do agregado e ciclo de vida (criar, carregar, remover)
2. Definir métodos mínimos no contrato
3. Implementar com ORM/query na infra; mapear para entidades de domínio
4. Compor transação via unit of work quando múltiplos repositórios participam

## Anti-padrões comuns

- Generic repository (`Get<T>`) sem semântica de domínio
- Repositório retornando tipos de ORM para casos de uso
- Query complexa de relatório forçada no mesmo repo do agregado
- Leaky abstraction (expor SQL builder na interface)

## Relacionado

- `domain-driven-design` — agregado raiz define fronteira do repo
- `hexagonal-architecture` — repositório como porta driven
- `clean-architecture` — gateway de persistência nos adaptadores
- `layered-architecture` — repo na camada de dados clássica
- `solid` — ISP em contratos de persistência focados
