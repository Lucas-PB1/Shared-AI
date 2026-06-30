# Padrões táticos

## Entity

- Identidade estável (ID); mutável ao longo do tempo
- Comportamento que protege invariantes

## Value object

- Sem identidade; imutável; substituível por valor
- Ex.: dinheiro, intervalo, endereço normalizado

## Aggregate (agregado)

- Cluster de entidades/VOs com **raiz** (aggregate root)
- Consistência transacional **dentro** do agregado; referências externas só por ID
- Raiz é único ponto de mutação exposto

## Domain events

- Fatos que ocorreram no passado; nome no passado (`PedidoConfirmado`)
- Desacoplam reações dentro ou entre BCs

## Domain services

- Operação de domínio que não cabe naturalmente em entidade/VO
- Stateless; ainda sem infra

## Factories

- Criação complexa ou invariantes na construção
- Evitar construtores públicos que quebram regras

## Checklist prático

- [ ] Tamanho do agregado minimizado para invariantes reais
- [ ] VO usado onde igualdade por valor faz sentido
- [ ] Eventos representam fatos, não comandos

## Exemplos mentais

- **Bom:** `Pedido.adicionarLinha` valida total e estoque reservado na raiz
- **Ruim:** grafo de 50 entidades carregadas para “consistência”

## Quando revisitar

- Performance por agregado grande
- Bug de concorrência entre instâncias da raiz
