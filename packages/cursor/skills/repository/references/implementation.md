# Implementação

## Responsabilidades

- Mapping bidirecional domínio ↔ persistência
- Transações delegadas ao unit of work ou contexto ORM
- Otimizações (lazy load, batch) **dentro** da implementação

## Mapping

- Anti-corruption entre schema existente e modelo novo na infra
- Não expor anemic data holder como “entidade” se domínio é rico

## Queries de leitura

- CQRS leve: repositório de escrita vs projeção/read model separados
- Relatórios pesados não poluem repo de agregado

## Testes

- Integração contra DB real ou testcontainer para mapping
- In-memory fake para casos de uso

## Checklist prático

- [ ] Mapping testado para agregado completo (filhos, VO)
- [ ] Concorrência (versão, optimistic lock) tratada na infra
- [ ] Índices e SQL revisados sem vazar para contrato

## Exemplos mentais

- **Bom:** `Salvar` persiste raiz + linhas em uma transação UoW
- **Ruim:** caso de uso monta JOIN manual via repo genérico

## Quando revisitar

- Mudança de schema ou sharding
- N+1 ou performance em `obterPorId`
