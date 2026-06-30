# Módulos

## Estrutura típica

```
ModuleName/
├── config/module.config.php
├── src/
│   └── Controller/
├── view/
└── Module.php
```

## Module.php

- `getConfig()` — merge de config (routes, services, view_manager)
- `getAutoloadConfig()` — namespace PSR-4 do módulo
- `getServiceConfig()` — factories (versões antigas; preferir module.config.php)

## module.config.php

- `router` — rotas literais e segment
- `controllers` — invokables e factories
- `service_manager` — factories e aliases
- `view_manager` — template_path_stack

## Modularidade

- Um bounded context por módulo quando possível
- Módulo `Application` ou `Core` para cross-cutting

## Evitar

- Módulo “god” com todas as features
- Rotas duplicadas entre módulos sem prefixo claro

## Relacionado

- skill `vertical-slice` — organização por feature
- skill `domain-driven-design` — bounded contexts
