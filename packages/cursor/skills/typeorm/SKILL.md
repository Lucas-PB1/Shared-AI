---
name: typeorm
description: >-
  Orienta TypeORM com Nest: entities, repositories, migrations, ViewEntity e
  relações. Use com @nestjs/typeorm, Entity, Repository ou queries TypeORM.
---

# TypeORM

## Quando usar

- Mapear tabelas/views a entities
- Repositories / QueryBuilder em módulos Nest
- Migrations e sincronização (dev vs prod)

## Princípios

- Entity ≠ DTO de API
- Preferir migrations versionadas; evitar `synchronize: true` em produção
- Views read-only via `@ViewEntity` quando o SQL é a fonte (catálogo)
- Transações explícitas em comandos que tocam vários agregados

## Referências

| Tópico | Arquivo |
| --- | --- |
| Entities e relations | [references/entities-and-relations.md](references/entities-and-relations.md) |
| Repos e queries | [references/repos-and-queries.md](references/repos-and-queries.md) |
| Migrations | [references/migrations.md](references/migrations.md) |

## Como aplicar

1. Alinhar entity ao schema SQL existente (não inventar coluna na entity só)
2. Injetar repository no service/handler; manter controller limpo
3. Para catálogo SQL-first, preferir views + query simples
4. Mudança de schema → migration SQL (ver `postgresql-sql`)

## Anti-padrões comuns

- `synchronize: true` em ambiente compartilhado/prod
- N+1 sem `relations` / QueryBuilder consciente
- Expor entity TypeORM direto na response HTTP

## Relacionado

- `nestjs`, `postgresql-sql`, `domain-driven-design`
