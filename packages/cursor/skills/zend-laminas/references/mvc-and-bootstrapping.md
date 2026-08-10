# MVC e bootstrapping

## Fluxo Laminas MVC

```
Request → Front Controller (index.php) → Application bootstrap
       → RouteMatch → Controller → View Model → Response
```

## Application config

- `config/application.config.php` — lista de módulos
- `config/autoload/*.php` — overrides por ambiente

## Controllers

- Estender `AbstractActionController` ou invokables
- Retornar `ViewModel` ou `JsonModel` para API

## Views

- Scripts `.phtml` no módulo (`view/`)
- Layout compartilhado via `layout/layout.phtml`

## Zend Framework vs Laminas

- Pacotes `zendframework/*` → migrar para `laminas/*` quando possível
- APIs similares; namespaces `Laminas\` substituem `Zend\`

## Evitar

- Lógica no `public/index.php` além do bootstrap
- Ignorar `Module.php` ao adicionar rotas ou serviços
