# ServiceManager

## Registro de serviços

```php
'service_manager' => [
    'factories' => [
        OrderService::class => OrderServiceFactory::class,
    ],
    'aliases' => [
        'OrderService' => OrderService::class,
    ],
],
```

## Factories

- `__invoke(ContainerInterface $container)` — resolver dependências
- Preferir constructor injection via factory

## Plugin managers

- `ControllerPluginManager`, `FormElementManager` — escopo específico

## Config aggregation

- `ConfigAggregator` merge configs de módulos (Laminas moderno)

## vs Service Locator

| Preferir | Evitar |
| --- | --- |
| Injetar no constructor via factory | `$this->getServiceLocator()->get(...)` no controller |

## Relacionado

- skill `solid` — DIP
- skill `hexagonal-architecture` — ports/adapters via DI
