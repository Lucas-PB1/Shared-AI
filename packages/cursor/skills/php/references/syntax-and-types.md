# Sintaxe e tipos (PHP 8+)

## Strict types

```php
declare(strict_types=1);
```

Ativar no topo de arquivos novos; evita coerção silenciosa.

## Recursos modernos

| Recurso | Uso |
| --- | --- |
| `match` | Substituir `switch` quando retorna valor |
| `enum` | Conjuntos finitos tipados |
| `readonly` / `readonly class` | Imutabilidade |
| Union / intersection types | Contratos explícitos |
| Named arguments | Chamadas com muitos parâmetros opcionais |
| Nullsafe `?->` | Encadeamento sem null checks verbosos |

## Arrays vs objetos

- Shape estável e reutilizado → DTO ou classe readonly
- Lista homogênea → `array` tipado (`list<string>`, `array<int, User>`)

## Constantes

- `const` em classe ou `enum` para valores de domínio
- Evitar números/strings literais sem nome (ver skill `no-magic-numbers`)

## Evitar

- Features deprecated sem plano de migração
- Tipagem fraca em código novo quando strict types está ativo
