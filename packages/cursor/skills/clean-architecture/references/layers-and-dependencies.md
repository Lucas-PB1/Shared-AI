# Camadas e regra de dependência

## Anéis (de fora para dentro)

1. **Frameworks & drivers** — web, DB, UI toolkit, mensageria
2. **Interface adapters** — controllers, presenters, gateways
3. **Application business rules** — casos de uso
4. **Enterprise business rules** — entidades

## Regra de dependência

- Código em anel interno não importa anel externo
- Comunicação outward via interfaces definidas no anel interno
- Inversão: infra implementa contrato do domínio

## Pseudocódigo de direção

```
// permitido
CasoDeUso → interface RepositorioPedido
AdapterDb implements RepositorioPedido

// proibido
Entidade → import DriverSql
```

## Boundaries físicos

- Pacotes ou módulos por anel, não misturar tipos de infra no núcleo
- Ferramentas de arquitetura (lint de camadas) opcionais em times grandes

## Checklist prático

- [ ] Núcleo compila sem referência a framework de persistência
- [ ] Adaptadores finos: traduzem protocolo ↔ DTO de caso de uso
- [ ] Testes de casos de uso com doubles de portas

## Exemplos mentais

- **Bom:** `EmitirFatura` recebe portas; teste usa repositório em memória
- **Ruim:** entidade chama `HttpClient.get` para validar CEP

## Quando revisitar

- Nova dependência externa (pagamento, identidade)
- Vazamento de tipos de ORM para casos de uso
