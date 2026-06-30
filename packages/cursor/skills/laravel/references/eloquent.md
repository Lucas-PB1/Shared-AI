# Eloquent

## Models

- `$fillable` explícito (ou `$guarded` consciente)
- Casts para tipos (`datetime`, `boolean`, enums)
- Relacionamentos nomeados no singular/plural correto

## Queries

- Eager loading: `User::with('orders')->get()` para evitar N+1
- Scopes locais para filtros reutilizáveis
- Query builder quando Eloquent fica obscuro

## Migrations

- Uma migration por alteração coerente
- Foreign keys e índices nomeados

## Domínio vs anêmico

- Model rico: métodos de domínio no model quando simples
- Model anêmico + Service/Action quando regras crescem — ver skill `repository`

## Evitar

- `$model->getConnection()->select('raw sql '.$input)`
- Lógica de apresentação no model (HTML, JSON shape)

## Relacionado

- skill `php/references/security-basics.md` — SQL injection
- skill `repository` — abstrair persistência complexa
