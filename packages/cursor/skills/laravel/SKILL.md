---
name: laravel
description: >-
  Orienta Laravel: rotas, Eloquent, HTTP, Blade, migrations e testes. Use ao
  desenvolver apps Laravel, APIs, controllers ou quando o usuário mencionar
  Eloquent, Artisan, Blade ou FormRequest.
---

# Laravel

## Quando usar

- Rotas, controllers, middleware
- Models Eloquent e migrations
- Views Blade e validação HTTP

## Princípios

- Lógica de negócio em Actions/Services — controllers finos
- FormRequest para validação e autorização de entrada
- Eloquent para persistência; domínio complexo pode usar repository (skill `repository`)

## Referências

| Tópico | Arquivo |
| --- | --- |
| Rotas | [references/routing.md](references/routing.md) |
| Eloquent | [references/eloquent.md](references/eloquent.md) |
| Camada HTTP | [references/http-layer.md](references/http-layer.md) |
| Blade | [references/blade.md](references/blade.md) |
| Migrations | [references/migrations-and-seeding.md](references/migrations-and-seeding.md) |
| Testes | [references/testing.md](references/testing.md) |

## Como aplicar

1. Confirmar versão Laravel e estrutura (`app/`, `routes/`, `database/`)
2. Ler referência do tópico (rota, model, request)
3. Seguir convenções Artisan e PSR-4 do projeto
4. Testar com Feature/Unit test quando alterar comportamento

## Anti-padrões comuns

- Regra de negócio pesada no controller ou no Model
- `$guarded = []` ou mass assignment sem cuidado
- N+1 queries sem `with()` ou eager loading
- Raw SQL quando query builder/Eloquent resolve

## Relacionado

- Linguagem → skill `php`
- Persistência → skill `repository`
- Qualidade → `clean-code`, `solid`, `dry`
