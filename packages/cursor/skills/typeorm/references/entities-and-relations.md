# Entities e relations

- `@Entity` / `@ViewEntity` com nome de tabela/view explícito
- Colunas tipadas; enums alinhados ao Postgres quando existirem
- Relations: `ManyToOne` / `OneToMany` só onde o grafo é necessário — catálogo read-only pode ser flat
- Não misturar validação de HTTP na entity
