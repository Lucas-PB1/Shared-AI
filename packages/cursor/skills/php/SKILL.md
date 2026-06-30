---
name: php
description: >-
  Orienta PHP moderno (8+): tipos, OOP, namespaces, erros e segurança. Use ao
  escrever ou revisar código PHP, classes, Composer ou quando o usuário pedir
  padrões da linguagem PHP sem framework específico.
---

# PHP

## Quando usar

- Código PHP puro ou bibliotecas compartilhadas
- Classes, interfaces, traits e autoload PSR-4
- Tratamento de erros e validação de entrada

## Princípios

- Tipagem estrita (`declare(strict_types=1)`) quando possível
- Imutabilidade com `readonly` onde couber
- Exceções tipadas em vez de retornos mágicos

## Referências

| Tópico | Arquivo |
| --- | --- |
| Sintaxe e tipos | [references/syntax-and-types.md](references/syntax-and-types.md) |
| OOP | [references/oop.md](references/oop.md) |
| Namespaces e autoload | [references/namespaces-and-autoload.md](references/namespaces-and-autoload.md) |
| Erros | [references/error-handling.md](references/error-handling.md) |
| Segurança | [references/security-basics.md](references/security-basics.md) |

## Como aplicar

1. Identificar se o contexto é linguagem pura ou framework (Laravel, Laminas)
2. Ler a referência do tópico (tipos, OOP, segurança)
3. Aplicar o padrão mínimo; extrair classes quando responsabilidades divergem
4. Validar com PHPUnit/Pest ou análise estática (PHPStan/Psalm) se disponível

## Anti-padrões comuns

- `@` para suprimir erros
- `mixed` e arrays associativos sem DTO quando o shape é estável
- SQL concatenado com input do usuário
- Misturar lógica de framework dentro de classes de domínio puro

## Relacionado

- Framework Laravel → skill `laravel`
- Zend / Laminas → skill `zend-laminas`
- Persistência → skill `repository`
- Qualidade → skills `clean-code`, `dry`, `solid` (ver localização em orquestrador `base.mdc`)
