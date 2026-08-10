---
name: zend-laminas
description: >-
  Orienta Zend Framework / Laminas: MVC, módulos, ServiceManager e forms.
  Use ao manter apps Laminas ou Zend Framework clássico, módulos MVC ou quando o usuário
  mencionar laminas, zendframework, ServiceManager ou Module.php.
---

# Zend / Laminas

## Quando usar

- Apps MVC Laminas (sucessor do Zend Framework)
- Estrutura modular (`Module.php`)
- DI via ServiceManager, forms e input filters

## Princípios

- Módulos coesos com config em `module.config.php`
- Factories para serviços com dependências
- Controllers finos; lógica em services/models

## Referências

| Tópico | Arquivo |
| --- | --- |
| MVC e bootstrap | [references/mvc-and-bootstrapping.md](references/mvc-and-bootstrapping.md) |
| Módulos | [references/modules.md](references/modules.md) |
| ServiceManager | [references/service-manager.md](references/service-manager.md) |
| Forms e filters | [references/forms-and-filters.md](references/forms-and-filters.md) |

## Como aplicar

1. Identificar módulo e namespace (`Vendor\Module\`)
2. Registrar serviços no ServiceManager via factory
3. Rotas em config do módulo; controller → service
4. Forms com InputFilter para validação server-side

## Anti-padrões comuns

- Service Locator espalhado (`$sm->get()` no meio do código)
- Controllers com lógica de negócio extensa
- Copiar config entre módulos em vez de módulo compartilhado

## Relacionado

- Linguagem → skill `php`
- DI e camadas → skills `hexagonal-architecture`, `repository` (orquestrador `base.mdc`)
- Laravel (migração) → skill `laravel`
