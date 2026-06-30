# Migrations e seeding

## Migrations

```bash
php artisan make:migration create_orders_table
```

- `up()` reversível com `down()` quando possível
- Tipos explícitos; `foreignId()->constrained()->cascadeOnDelete()` quando aplicável

## Seeders e factories

- Factory para dados de teste e dev
- Seeder para dados estáticos (roles, config) — não copy de produção

## Ambientes

- Nunca rodar seed destrutivo em produção sem processo
- Usar `--force` em deploy automatizado com cuidado

## Evitar

- Editar migration já aplicada em produção — criar nova migration
- Dados sensíveis em seeders versionados

## Relacionado

- skill `laravel/references/eloquent.md`
- skill `laravel/references/testing.md`
