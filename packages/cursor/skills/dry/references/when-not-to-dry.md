# Quando não forçar DRY

## Duplicação aceitável

- Poucas linhas em contextos que divergem com frequência
- Custo de abstração maior que ganho

## Falsa similaridade

- Telas parecidas com regras diferentes — manter separadas
- DTO duplicado entre camadas pode ser desacoplamento saudável

## Abstração prematura

- Switch por tipo gigante pior que funções específicas
- Esperar padrão estável antes de unificar

## Performance e legibilidade

- Inline intencional em hot path — medir primeiro
- Indireção excessiva prejudica leitura
