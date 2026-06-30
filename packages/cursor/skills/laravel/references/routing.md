# Rotas

## Definição

- `routes/web.php` — sessão, CSRF, Blade
- `routes/api.php` — stateless, prefixo `/api`, throttle

## Named routes

- Preferir `route('orders.show', $order)` a URLs hardcoded
- Nomes descritivos: `orders.store`, `admin.users.index`

## Grupos e middleware

```php
Route::middleware(['auth'])->group(function () {
    Route::resource('orders', OrderController::class);
});
```

## Controllers

- Invokable controllers para ações únicas
- Resource controllers para CRUD padrão

## API

- Versionar quando necessário (`/api/v1/...`)
- Resources/JsonResource para shape de resposta consistente

## Evitar

- Closures grandes em arquivos de rota — mover para controller/action
- Rotas duplicadas sem named routes
