# Migrations

- Schema versionado em SQL (ou TypeORM migrations) — uma mudança = um arquivo
- Dev: reset controlado; prod: só migrate forward
- Seeds separados de migrations de schema
- Se o projeto já tem pasta `database/migrations`, seguir esse fluxo antes de gerar migration TypeORM paralela
