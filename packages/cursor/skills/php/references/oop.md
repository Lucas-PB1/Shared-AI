# OOP em PHP

## Classes

- Uma responsabilidade por classe (SRP)
- Preferir composição a herança profunda
- `final` quando extensão não é desejada

## Interfaces e abstrações

- Depender de interfaces, não de implementações concretas
- Interfaces pequenas (ISP) — ver skill `solid`

## Traits

- Usar para compartilhar comportamento horizontal, não como herança múltipla
- Evitar traits que acumulam responsabilidades não relacionadas

## Encapsulamento

- Propriedades `private`/`protected`; expor via métodos ou readonly
- Getters/setters só quando há regra ou invariante

## Exemplo mental

```
OrderService → depende de OrderRepositoryInterface
OrderRepository → implementação Eloquent ou PDO na infra
```

## Relacionado

- skill `repository` para abstração de persistência
- skill `clean-architecture` para direção de dependências
