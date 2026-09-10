# Repos e queries

- `@InjectRepository(Entity)` ou custom repository
- QueryBuilder para filtros dinâmicos; raw SQL só com parâmetro bind
- Paginação explícita (`take`/`skip` ou keyset)
- Preferir métodos de domínio no service em vez de QueryBuilder espalhado no controller
