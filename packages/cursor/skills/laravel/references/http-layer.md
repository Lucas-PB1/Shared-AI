# Camada HTTP

## Controllers

- Finos: receber request, delegar, retornar response
- Injetar dependências via constructor (DI container)

## FormRequest

- Validação em `rules()`
- Autorização em `authorize()`
- Mensagens customizadas quando UX exige

## Middleware

- Cross-cutting: auth, throttle, CORS
- Registrar em `bootstrap/app.php` (Laravel 11+) ou `Kernel`

## Responses

- Redirect com flash para web
- `JsonResponse` / API Resources para API
- Status HTTP corretos (201 create, 404 not found, 422 validation)

## Evitar

- Validar manualmente com `$request->all()` espalhado
- Controller com dezenas de métodos não relacionados

## Relacionado

- skill `laravel/references/routing.md`
- skill `security` — validação de input
