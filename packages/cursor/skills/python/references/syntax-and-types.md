# Sintaxe e tipos (Python 3.10+)

## Versão alvo

- Preferir 3.10+ (`match`, union com `|`, parenthesized context managers)
- 3.12+ quando o projeto já declara — PEP 695 (`type Alias = ...`)

## Tipagem

| Recurso | Uso |
| --- | --- |
| `X \| Y` | Unions (preferir a `Optional`/`Union` legado) |
| `list[str]`, `dict[str, int]` | Coleções genéricas built-in |
| `TypedDict` / `@dataclass` | Shape estável de dict ou registro |
| `Protocol` | Structural typing (duck typing tipado) |
| `Literal`, `Final` | Valores fixos e constantes |
| `Self` | Métodos que retornam a própria classe |

## Estruturas de dados

- Registro imutável reutilizado → `@dataclass(frozen=True)` ou `NamedTuple`
- Enum finito de domínio → `enum.Enum` ou `StrEnum`
- Dict com chaves conhecidas → `TypedDict`; shape estável em vários módulos → dataclass

## Comprehensions e iteradores

- Generator quando a lista completa não precisa existir na memória
- Evitar comprehension aninhada ilegível — loop explícito se melhorar leitura

## Constantes

- UPPER_SNAKE em módulo para constantes de configuração
- Evitar números/strings literais sem nome (skill `no-magic-numbers`)

## Evitar

- `# type: ignore` sem comentário do motivo
- `Any` em código novo quando o shape é conhecido
- Mutar argumentos default ou objetos globais compartilhados
