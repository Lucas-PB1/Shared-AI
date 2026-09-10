# Migrations e seeds

- Ordem lexicográfica / timestamp nos nomes de arquivo
- Migrations: DDL (tabelas, constraints, indexes)
- Seeds: dados de referência; idempotentes quando possível (`ON CONFLICT`)
- Scripts do projeto (`db:migrate`, `db:seed`) — seguir README do repo
- Dev reset (`DROP SCHEMA` / `db reset`) só em banco local descartável
