# Interface Segregation Principle

## Ideia

- Clientes não devem depender de métodos que não usam
- Preferir várias interfaces pequenas a uma “God interface”

## Na prática

- Props de componente enxutas; composição em vez de prop monolítica
- APIs REST granulares vs endpoint que faz tudo

## React

- Split de contextos por domínio (auth vs theme vs cart)
