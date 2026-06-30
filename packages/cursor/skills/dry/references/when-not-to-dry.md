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

## Checklist prático

- [ ] Comportamento atual documentado ou coberto por teste antes de mudar
- [ ] Nomes e contratos claros para quem lê o código pela primeira vez
- [ ] Edge cases relevantes considerados (vazio, erro, mobile, teclado)
- [ ] Nenhum segredo ou dado sensível exposto inadvertidamente

## Exemplos mentais

- **Bom:** mudança pequena, intenção evidente no diff, fácil de reverter
- **Ruim:** abstração genérica usada uma vez, ou fix local que duplica regra global

## Quando revisitar

- Após feedback de review, bug em produção ou mudança de requisito
- Quando o mesmo padrão aparecer pela terceira vez (considerar extrair)

