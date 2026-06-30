# Testes nas bordas

## Pirâmide alinhada ao hexágono

- **Núcleo:** testes unitários de entidades e casos de uso com fakes in-memory
- **Adaptadores:** testes de integração contra infra real ou containers
- **Driving:** testes de contrato API ou e2e finos (poucos, caros)

## Fakes vs mocks

- Fake repositório em memória implementa porta completamente
- Mock verifica chamadas quando comportamento importa menos que interação

## Contract tests (adaptador driven)

- Suite que roda contra implementação real (DB) e fake
- Garante que adaptador honra semântica da porta (transação, unicidade)

## O que não testar no núcleo

- Serialização JSON específica, SQL gerado, headers HTTP
- Isso fica nos adaptadores respectivos

## Checklist prático

- [ ] Casos de uso cobertos sem rede nem disco
- [ ] Pelo menos um teste de integração por adaptador crítico
- [ ] Regressão de bug de domínio vira teste no núcleo, não só e2e

## Exemplos mentais

- **Bom:** falha de saldo testada em `Conta` + `Transferir` com fake
- **Ruim:** único teste e2e de 5 minutos para cada regra

## Quando revisitar

- Adaptador novo sem testes de contrato
- Flaky tests por dependência de relógio ou rede no núcleo
