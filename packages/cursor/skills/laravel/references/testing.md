# Testes Laravel

## Tipos

| Tipo | Uso |
| --- | --- |
| Unit | Classes puras, sem HTTP/DB |
| Feature | Rotas, controllers, integração HTTP |
| Browser/Dusk | E2E (quando configurado) |

## PHPUnit / Pest

- `RefreshDatabase` ou `DatabaseTransactions` em feature tests
- `actingAs($user)` para auth

## Fakes

- `Event::fake()`, `Queue::fake()`, `Mail::fake()` para isolar side effects
- `Http::fake()` para APIs externas

## Assertions

- `$response->assertStatus(200)->assertJsonStructure([...])`
- `assertDatabaseHas('orders', ['status' => 'paid'])`

## Evitar

- Testes que dependem de ordem de execução
- Hit em API externa real nos testes

## Relacionado

- skill `php` — linguagem
- skill `testing` — padrões gerais (adaptar para PHPUnit)
