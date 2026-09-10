---
name: postgresql-sql
description: >-
  Orienta PostgreSQL SQL-first: schema, migrations, seeds, views e índices. Use
  ao editar .sql, migrations granulares, seeds ou views de catálogo.
---

# PostgreSQL / SQL

## Quando usar

- Migrations e seeds versionados
- Views para leitura (catálogo)
- Índices, constraints, grants

## Princípios

- SQL é fonte de verdade do schema quando o projeto for SQL-first
- Uma migration = uma mudança coerente; seeds separados
- Views estáveis como contrato de leitura para a API
- Nunca rodar reset destrutivo em banco compartilhado/prod

## Referências

| Tópico | Arquivo |
| --- | --- |
| Migrations e seeds | [references/migrations-and-seeds.md](references/migrations-and-seeds.md) |
| Views e contratos | [references/views-and-contracts.md](references/views-and-contracts.md) |

## Como aplicar

1. Alterar schema via novo arquivo de migration
2. Atualizar seeds se dados de referência mudarem
3. Ajustar TypeORM `@ViewEntity` / entity se o contrato mudar
4. Validar em Docker local antes de aplicar remoto

## Anti-padrões comuns

- Editar migration já aplicada em ambientes que não são efêmeros
- Misturar DML massivo de seed dentro de migration de schema sem necessidade
- View que quebra consumidores sem versionar o contrato

## Relacionado

- `typeorm`, `nestjs`, `supabase`, `env-secrets`
