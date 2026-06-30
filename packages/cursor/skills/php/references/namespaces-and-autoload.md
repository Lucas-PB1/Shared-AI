# Namespaces e autoload

## PSR-4

- Namespace alinhado à estrutura de pastas
- Configurar em `composer.json`:

```json
"autoload": {
  "psr-4": {
    "App\\": "src/"
  }
}
```

Rodar `composer dump-autoload` após mudanças.

## Convenções

- Um namespace por arquivo (classe principal = nome do arquivo)
- Sufixos claros: `UserRepository`, `CreateOrderHandler`, `OrderNotFoundException`

## Imports

- `use` no topo; evitar FQCN repetido no corpo
- Ordem: PHP nativo → vendor → App

## Evitar

- Autoload classmap manual quando PSR-4 basta
- Namespaces genéricos (`Utils`, `Helpers`) sem domínio

## Relacionado

- Laravel: namespace `App\` padrão — skill `laravel`
- Laminas: módulos com namespace próprio — skill `zend-laminas`
