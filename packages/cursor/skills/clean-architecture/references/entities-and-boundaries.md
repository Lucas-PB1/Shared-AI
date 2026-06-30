# Entidades e boundaries

## Entidades (enterprise rules)

- Objetos com identidade e invariantes que sobrevivem a mudanças de UI
- Encapsulam estado e comportamento; evitar getters/setters públicos cegos
- Não conhecem persistência nem formato de API

## Value objects no núcleo

- Imutáveis, comparados por valor (Money, Email, Periodo)
- Validados na construção; falha rápida

## Boundaries entre anéis

- **Entrada:** DTO/primitive → validação de formato no adapter
- **Caso de uso:** monta entidades a partir de IDs e comandos
- **Saída:** entidade ou read model → presenter formata resposta

## O que não colocar na entidade

- Anotações de ORM, serialização JSON específica
- Chamadas a clock ou random — injetar via domínio ou caso de uso

## Checklist prático

- [ ] Invariantes testadas sem mocks de infra
- [ ] Agregados com raiz clara e consistência transacional
- [ ] Boundaries documentados onde DTO termina e entidade começa

## Exemplos mentais

- **Bom:** `Conta.debitar(valor)` recusa saldo insuficiente
- **Ruim:** entidade só campos públicos; regra no repositório SQL

## Quando revisitar

- Regras espalhadas entre entidade e caso de uso sem critério
- Modelo de persistência distorce modelo de domínio (impedance mismatch)
