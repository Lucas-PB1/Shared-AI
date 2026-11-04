# Liskov Substitution Principle

## Ideia

- Subtipos devem ser substituíveis pelo tipo base sem surpresas
- Contratos (pré/pós-condições) preservados

## Na prática

- Subclasse não enfraquece garantias do pai
- Não lançar exceções inesperadas onde o base retorna valor

## TypeScript

- Interfaces coerentes; evitar optional que quebra expectativa do consumidor
