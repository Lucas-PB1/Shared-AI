# Dependency Inversion Principle

## Ideia

- Módulos de alto nível não dependem de baixo nível; ambos dependem de abstrações
- Injetar dependências (constructor, props, factory)

## Na prática

- Repository interface; implementação trocável em testes
- Mock de clock, HTTP client, storage

## Testes

- Doubles substituem infraestrutura real
- Evitar singletons globais difíceis de resetar
